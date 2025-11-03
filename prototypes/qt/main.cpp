#include <QApplication>
#include <QCoreApplication>
#include <QDebug>
#include <QDir>
#include <QDirIterator>
#include <QFile>
#include <QFileDialog>
#include <QFileInfo>
#include <QObject>
#include <QPair>
#include <QSettings>
#include <QStandardPaths>
#include <QStringList>
#include <QUrl>
#include <QVariantList>
#include <QVariantMap>
#include <QWebChannel>
#include <QWebEnginePage>
#include <QWebEngineProfile>
#include <QWebEngineSettings>
#include <QWebEngineView>

#include <algorithm>

namespace {
constexpr auto kOrgName = "NightVsKnight";
constexpr auto kOrgDomain = "nightvsknight.dev";
constexpr auto kAppName = "QtWebEnginePrototype";

QString defaultMusicRoot() {
  const QString music =
      QStandardPaths::writableLocation(QStandardPaths::MusicLocation);
  if (!music.isEmpty()) return music;
  return QDir::homePath();
}

QString trackDisplayName(const QString &fileName) {
  QString display = fileName;
  if (display.endsWith(".mp3", Qt::CaseInsensitive)) display.chop(4);
  return display;
}
}  // namespace

class PlayerBridge : public QObject {
  Q_OBJECT

 public:
  explicit PlayerBridge(QObject *parent = nullptr)
      : QObject(parent), settings_(QString::fromUtf8(kOrgName),
                                   QString::fromUtf8(kAppName)) {
    lastFolderPath_ = settings_.value("player/lastFolder").toString();
    lastTrackKey_ = settings_.value("player/lastTrackKey").toString();
    shuffleEnabled_ = settings_.value("player/shuffle", true).toBool();
    loopMode_ = settings_.value("player/loopMode", QStringLiteral("all")).toString();
    volumePercent_ = settings_.value("player/volume", 100).toInt();
    announceEnabled_ = settings_.value("player/announce", true).toBool();
    vizMode_ = settings_.value("player/vizMode", QStringLiteral("bars")).toString();
    const QString storedNowPlaying =
        settings_.value("player/nowPlayingPath").toString();
    if (!storedNowPlaying.isEmpty()) {
      QFileInfo info(storedNowPlaying);
      if (info.isAbsolute()) {
        nowPlayingFilePath_ = info.absoluteFilePath();
      } else {
        nowPlayingFilePath_ =
            QFileInfo(QDir::current(), storedNowPlaying).absoluteFilePath();
      }
    }
  }

 public slots:
  void chooseFolder() {
    const QString startDir =
        lastFolderPath_.isEmpty() ? defaultMusicRoot() : lastFolderPath_;
    qInfo() << "[QtBridge] chooseFolder starting at" << startDir;
    const QString directory = QFileDialog::getExistingDirectory(
        nullptr, tr("Select music folder"), startDir,
        QFileDialog::ShowDirsOnly | QFileDialog::DontResolveSymlinks);
    if (directory.isEmpty()) {
      qInfo() << "[QtBridge] folder selection cancelled";
      emit notify(QStringLiteral("info"),
                  tr("Folder selection cancelled. No changes made."));
      return;
    }

    if (!emitFolderContents(directory, /*persist=*/true)) {
      emit notify(QStringLiteral("error"),
                  tr("Unable to read the selected folder."));
      return;
    }
    qInfo() << "[QtBridge] folder chosen:" << directory;
  }

  void requestInitialState() {
    qInfo() << "[QtBridge] requestInitialState: lastFolder="
            << (lastFolderPath_.isEmpty() ? "<none>" : lastFolderPath_);
    QVariantMap state;
    state.insert(QStringLiteral("trackKey"), lastTrackKey_);
    state.insert(QStringLiteral("shuffle"), shuffleEnabled_);
    state.insert(QStringLiteral("loopMode"), loopMode_);
    state.insert(QStringLiteral("volume"), volumePercent_);
    state.insert(QStringLiteral("announceEnabled"), announceEnabled_);
    state.insert(QStringLiteral("vizMode"), vizMode_);
    emit playbackStateRestored(state);
    emit textFileStatusChanged(textFileConfigMap());

    if (!lastFolderPath_.isEmpty()) {
      if (!emitFolderContents(lastFolderPath_, /*persist=*/false)) {
        emit notify(QStringLiteral("error"),
                    tr("Last folder is unavailable: %1").arg(lastFolderPath_));
      }
    }
  }

  void savePlaybackState(const QString &trackKey, bool shuffle,
                         const QString &loopMode, int volumePercent,
                         bool announceEnabled, const QString &vizMode) {
    lastTrackKey_ = trackKey;
    shuffleEnabled_ = shuffle;
    if (loopMode == QStringLiteral("all") || loopMode == QStringLiteral("one") ||
        loopMode == QStringLiteral("off")) {
      loopMode_ = loopMode;
    }
    volumePercent_ = std::clamp(volumePercent, 0, 100);
    announceEnabled_ = announceEnabled;
    if (!vizMode.isEmpty()) vizMode_ = vizMode;

    settings_.setValue("player/lastTrackKey", lastTrackKey_);
    settings_.setValue("player/shuffle", shuffleEnabled_);
    settings_.setValue("player/loopMode", loopMode_);
    settings_.setValue("player/volume", volumePercent_);
    settings_.setValue("player/announce", announceEnabled_);
    settings_.setValue("player/vizMode", vizMode_);
    settings_.sync();
  }

  QVariantMap getTextFileConfig() const { return textFileConfigMap(); }

  QVariantMap configureTextFileExport() {
    const QString suggested =
        nowPlayingFilePath_.isEmpty()
            ? QDir(defaultMusicRoot()).filePath(QStringLiteral("now-playing.txt"))
            : nowPlayingFilePath_;
    const QString selected = QFileDialog::getSaveFileName(
        nullptr, tr("Choose export file"), suggested,
        tr("Text Files (*.txt);;All Files (*)"));
    if (selected.isEmpty()) {
      return textFileConfigMap();
    }

    QFileInfo info(selected);
    QDir dir = info.dir();
    if (!dir.exists()) {
      if (!dir.mkpath(QStringLiteral("."))) {
        const QString err =
            tr("Unable to create folder: %1").arg(dir.absolutePath());
        emit notify(QStringLiteral("error"), err);
        qWarning() << "[QtBridge] configureTextFileExport mkpath failed"
                   << dir.absolutePath();
        return textFileConfigMap();
      }
    }

    const QString previousPath = nowPlayingFilePath_;
    nowPlayingFilePath_ = info.absoluteFilePath();
    settings_.setValue("player/nowPlayingPath", nowPlayingFilePath_);
    settings_.sync();

    if (!writeNowPlayingFile(QString())) {
      if (previousPath.isEmpty()) {
        nowPlayingFilePath_.clear();
        settings_.remove("player/nowPlayingPath");
      } else {
        nowPlayingFilePath_ = previousPath;
        settings_.setValue("player/nowPlayingPath", nowPlayingFilePath_);
      }
      settings_.sync();
      emit textFileStatusChanged(textFileConfigMap());
      return textFileConfigMap();
    }

    emit textFileStatusChanged(textFileConfigMap());
    emit notify(QStringLiteral("success"),
                tr("Now exporting to %1").arg(info.fileName()));
    return textFileConfigMap();
  }

  QVariantMap disableTextFileExport() {
    if (nowPlayingFilePath_.isEmpty()) return textFileConfigMap();
    nowPlayingFilePath_.clear();
    settings_.remove("player/nowPlayingPath");
    settings_.sync();
    emit textFileStatusChanged(textFileConfigMap());
    emit notify(QStringLiteral("success"),
                tr("Text file export disabled."));
    return textFileConfigMap();
  }

  bool writeNowPlayingText(const QString &content) {
    return writeNowPlayingFile(content);
  }

  bool clearNowPlayingText() { return writeNowPlayingFile(QString()); }

 signals:
  void folderLoaded(const QString &folderPath, const QString &folderName,
                    const QVariantList &tracks);
  void playbackStateRestored(const QVariantMap &state);
  void notify(const QString &level, const QString &message);
  void textFileStatusChanged(const QVariantMap &config);

 private:
  bool emitFolderContents(const QString &folderPath, bool persist) {
    QDir dir(folderPath);
    if (!dir.exists()) return false;

    const QVariantList tracks = buildTrackList(folderPath);
    const QString folderName = dir.dirName().isEmpty() ? dir.absolutePath()
                                                       : dir.dirName();
    qInfo() << "[QtBridge] emitFolderContents"
            << "path=" << dir.absolutePath()
            << "tracks=" << tracks.size();
    emit folderLoaded(dir.absolutePath(), folderName, tracks);

    if (persist) {
      lastFolderPath_ = dir.absolutePath();
      settings_.setValue("player/lastFolder", lastFolderPath_);
      settings_.sync();
    }
    return true;
  }

  QVariantList buildTrackList(const QString &folderPath) const {
    QVariantList items;
    QDir baseDir(folderPath);
    if (!baseDir.exists()) return items;

    using Entry = QPair<QString, QVariantMap>;
    QList<Entry> ordered;

    QDirIterator it(folderPath, QStringList{QStringLiteral("*.mp3")}, QDir::Files,
                    QDirIterator::Subdirectories);
    while (it.hasNext()) {
      const QString absolute = it.next();
      QFileInfo info(absolute);
      const QString relative =
          QDir::fromNativeSeparators(baseDir.relativeFilePath(absolute));

      QVariantMap track;
      track.insert(QStringLiteral("name"), info.fileName());
      track.insert(QStringLiteral("displayName"), trackDisplayName(info.fileName()));
      track.insert(QStringLiteral("relativePath"), relative);
      track.insert(QStringLiteral("fileUrl"),
                   QUrl::fromLocalFile(absolute).toString());
      track.insert(QStringLiteral("folderPath"), info.absolutePath());

      ordered.append({relative.toLower(), track});
    }

    std::sort(ordered.begin(), ordered.end(),
              [](const Entry &a, const Entry &b) { return a.first < b.first; });

    for (const auto &entry : ordered) {
      items.append(entry.second);
    }
    qInfo() << "[QtBridge] buildTrackList scanned" << items.size()
            << "files in" << folderPath;
    return items;
  }

  QVariantMap textFileConfigMap() const {
    QVariantMap config;
    const bool enabled = !nowPlayingFilePath_.isEmpty();
    config.insert(QStringLiteral("enabled"), enabled);
    config.insert(QStringLiteral("path"), nowPlayingFilePath_);
    config.insert(QStringLiteral("fileName"),
                  enabled ? QFileInfo(nowPlayingFilePath_).fileName()
                          : QString());
    return config;
  }

  bool writeNowPlayingFile(const QString &content) {
    if (nowPlayingFilePath_.isEmpty()) return true;

    QFileInfo info(nowPlayingFilePath_);
    QDir dir = info.dir();
    if (!dir.exists()) {
      if (!dir.mkpath(QStringLiteral("."))) {
        const QString err =
            tr("Unable to create folder for now-playing file: %1")
                .arg(dir.absolutePath());
        emit notify(QStringLiteral("error"), err);
        qWarning() << "[QtBridge] writeNowPlayingFile mkpath failed"
                   << dir.absolutePath();
        return false;
      }
    }

    QFile file(info.absoluteFilePath());
    if (!file.open(QIODevice::WriteOnly | QIODevice::Text |
                   QIODevice::Truncate)) {
      const QString err =
          tr("Unable to write now-playing file: %1").arg(file.errorString());
      emit notify(QStringLiteral("error"), err);
      qWarning() << "[QtBridge] writeNowPlayingFile open failed"
                 << info.absoluteFilePath() << file.errorString();
      return false;
    }

    const QByteArray data = content.toUtf8();
    if (file.write(data) != data.size()) {
      const QString err =
          tr("Unable to write now-playing file: %1").arg(file.errorString());
      emit notify(QStringLiteral("error"), err);
      qWarning() << "[QtBridge] writeNowPlayingFile write failed"
                 << info.absoluteFilePath() << file.errorString();
      file.close();
      return false;
    }

    file.flush();
    file.close();
    return true;
  }

  QSettings settings_;
  QString lastFolderPath_;
  QString lastTrackKey_;
  bool shuffleEnabled_ = true;
  QString loopMode_ = QStringLiteral("all");
  int volumePercent_ = 100;
  bool announceEnabled_ = true;
  QString vizMode_ = QStringLiteral("bars");
  QString nowPlayingFilePath_;
};

int main(int argc, char *argv[]) {
  QApplication app(argc, argv);
  QCoreApplication::setOrganizationName(QString::fromUtf8(kOrgName));
  QCoreApplication::setOrganizationDomain(QString::fromUtf8(kOrgDomain));
  QCoreApplication::setApplicationName(QString::fromUtf8(kAppName));

  const QString dataRoot =
      QStandardPaths::writableLocation(QStandardPaths::AppDataLocation);
  QDir().mkpath(dataRoot);
  QDir().mkpath(dataRoot + "/cache");

  auto profile =
      new QWebEngineProfile(QStringLiteral("LocalWebAudioPlayer"), &app);
  profile->setPersistentStoragePath(dataRoot);
  profile->setCachePath(dataRoot + "/cache");
  profile->setHttpCacheType(QWebEngineProfile::DiskHttpCache);
  profile->setPersistentCookiesPolicy(
      QWebEngineProfile::ForcePersistentCookies);
  profile->settings()->setAttribute(QWebEngineSettings::LocalStorageEnabled,
                                    true);
  profile->settings()->setAttribute(
      QWebEngineSettings::LocalContentCanAccessFileUrls, true);
  profile->settings()->setAttribute(
      QWebEngineSettings::LocalContentCanAccessRemoteUrls, true);

  QWebEngineView view;
  auto page = new QWebEnginePage(profile, &view);
  view.setPage(page);

  PlayerBridge bridge;
  auto channel = new QWebChannel(&view);
  channel->registerObject(QStringLiteral("backend"), &bridge);
  page->setWebChannel(channel);

  const QString htmlPath =
      QDir(QCoreApplication::applicationDirPath()).filePath("index.html");
  view.load(QUrl::fromLocalFile(htmlPath));
  view.setWindowTitle(QStringLiteral("Qt WebEngine Prototype"));
  view.resize(1280, 900);
  view.show();

  QObject::connect(&view, &QWebEngineView::loadFinished, &bridge,
                   [&bridge](bool ok) {
                     if (ok) bridge.requestInitialState();
                   });

  return app.exec();
}

#include "main.moc"
