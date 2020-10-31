const { execSync, spawnSync } = require('child_process')
const os = require('os')
const without = require('lodash/without')
const humanFormat = require('human-format')

const { username: USER_NAME, homedir: HOME_DIR } = os.userInfo()
const MEDIA_USER_PATH = `/media/${USER_NAME}`
const BACKUP_DIRECTORY_NAME = 'HOME_BACKUP'

// https://www.baeldung.com/linux/bash-interactive-prompts
// say yes in interactive script example: run('yes | apt remove baobab')
// answer to multiply answers in interactive script example: run('printf "bot\nn\nJava" | ./questions.sh')
const run = (command, options = {}) => execSync(command, { stdio: 'inherit', ...options })

function getMediaItems () {
  return execSync(`ls ${MEDIA_USER_PATH}`)
    .toString()
    .split('\n')
    .filter(Boolean)
}

function getDirectorySize (path) {
  return spawnSync('du', ['-ksh', path])
    .output.toString()
    .split('\t')[0]
    .slice(1)
}

const hasErr = command => {
  try {
    run(command, { stdio: 'ignore' })
  } catch (err) {
    return true
  }

  return false
}
const hasNotErr = command => !hasErr(command)

async function detectPluggedUsb () {
  const mediaItemsBefore = getMediaItems()
  try {
    run(
      `zenity --info --width=300 --text='Считаны текущие подключенные устройства.\\n\\nВставьте флешку или жесткий диск, куда необходимо записать резервную копию пользовательских данных и после этого нажмите "ОК"'`
    )
  } catch (err) {
    process.exit(0)
  }

  const mediaItemsAfter = getMediaItems()
  const newItems = without(mediaItemsAfter, ...mediaItemsBefore)
  if (newItems.length > 1) {
    try {
      run(
        `zenity --warn --width=300 --text='Обнаружено сразу несколько новых устройств!\\n\\nРезервная копия будет записана на накопитель с наибольшей свободной памятью'`
      )
    } catch (err) {
      process.exit(0)
    }
  } else if (!newItems.length) {
    try {
      run("zenity --error --width=300 --text='Не обнаружено ни одного нового подключенного устройства!'")
    } catch (err) {
      //
    }
    process.exit(0)
  }

  const device = newItems.reduce(
    (result, current) => {
      const path = `${MEDIA_USER_PATH}/${current}`
      const availableSizeIndex = 3
      const humanSize = execSync(`df -h | grep ${path}`)
        .toString()
        .replace(/\n/g, '')
        .split(/\s+/)[availableSizeIndex]
      const info = {
        path,
        size: humanFormat.parse(humanSize),
        humanSize
      }

      return result.size > info.size ? result : info
    },
    { size: 0 }
  )

  return device
}

async function makeBackup () {
  const device = await detectPluggedUsb()
  console.log(`|42| device ->    `, device)

  const homeFilesHumanSize = getDirectorySize(HOME_DIR)
  const homeFilesSize = humanFormat.parse(homeFilesHumanSize)

  console.log(`|42| homeFilesHumanSize ->    `, homeFilesHumanSize)
  console.log(`|42| homeFilesSize ->    `, homeFilesSize)
  let availableSizeInDevice = device.size
  console.log(`|42| availableSizeInDevice ->    `, availableSizeInDevice)
  const pathToPrevBackup = `${device.path}/${BACKUP_DIRECTORY_NAME}`
  console.log(`|42| pathToPrevBackup ->    `, pathToPrevBackup)
  const hasPrevBackup = hasNotErr(pathToPrevBackup) 
  console.log(`|42| hasPrevBackup ->    `, hasPrevBackup)
  if (hasPrevBackup) {
    const backupDirectoryHumanSize = getDirectorySize(pathToPrevBackup)
    console.log(`|42| backupDirectoryHumanSize ->    `, backupDirectoryHumanSize)
    availableSizeInDevice += humanFormat.parse(backupDirectoryHumanSize)
    console.log(`|42| availableSizeInDevice ->    `, availableSizeInDevice)
  }

  if (homeFilesSize >= availableSizeInDevice) {
    try {
      run(
        `zenity --error --width=300 --text='Не могу записать!\\n\\nСлишком мало места для записи данных.\\nНужно: "${homeFilesHumanSize}", а доступно только: "${humanFormat(
          availableSizeInDevice
        ).replace(' ', '')}"'`
      )
    } catch (err) {
      //
    }
    process.exit(0)
  }

  if (hasPrevBackup) {
    console.log(`|42| before remove`)
    run(
      `rm -rf ${pathToPrevBackup} | zenity --progress --pulsate --auto-close --auto-kill --text="Удаление прошлой резервной копии... | не вынимать накопитель!"`
    )
    console.log(`|42| after remove`)
  }

  try {
    console.log(`|42| before cp`)
    run(
      `cp -r ${HOME_DIR}/Downloads/my ${pathToPrevBackup} | zenity --progress --pulsate --auto-close --auto-kill --text="Создание новой резервной копии... | не вынимать накопитель!"`
    )
    console.log(`|42| after cp`)
    run("zenity --info --width=300 --text='Создание резервной копии успешно завершено.'")
  } catch (err) {
    //
  }
  process.exit(0)
}

async function main () {
  await makeBackup()
}

main()
