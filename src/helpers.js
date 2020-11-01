const { execSync, spawnSync } = require('child_process')
const { MEDIA_USER_PATH } = require('./constants')

// https://www.baeldung.com/linux/bash-interactive-prompts
// say yes in interactive script example: run('yes | apt remove baobab')
// answer to multiply answers in interactive script example: run('printf "bot\nn\nJava" | ./questions.sh')
exports.run = (command, options = {}) => execSync(command, { stdio: 'inherit', ...options })

exports.getMediaItems = () => {
  return execSync(`ls '${MEDIA_USER_PATH}'`)
    .toString()
    .split('\n')
    .filter(Boolean)
}

exports.getDirectorySize = path => {
  return spawnSync('du', ['-ksh', path])
    .output.toString()
    .split('\t')[0]
    .slice(1)
}

exports.hasErr = command => {
  try {
    exports.run(command, { stdio: 'ignore' })
  } catch (err) {
    return true
  }

  return false
}
exports.hasNotErr = command => !exports.hasErr(command)

exports.zenity = (stringCommand, options) => {
  let preparedCommand = stringCommand.includes('| zenity') ? stringCommand : `zenity ${stringCommand}`
  if (!stringCommand.includes('--width=')) {
    preparedCommand += ' --width=300'
  }

  try {
    return exports.run(preparedCommand, options)
  } catch (err) {
    process.exit(0)
  }
}
