const os = require('os')
const { username, homedir } = os.userInfo()

exports.USER_NAME = username
exports.HOME_DIR = homedir
exports.MEDIA_USER_PATH = `/media/${exports.USER_NAME}`
exports.BACKUP_DIRECTORY_NAME = 'HOME_BACKUP'
