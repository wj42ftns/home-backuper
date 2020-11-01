const { execSync } = require('child_process')
const without = require('lodash/without')
const humanFormat = require('human-format')
const { HOME_DIR, MEDIA_USER_PATH, BACKUP_DIRECTORY_NAME } = require('./constants')
const { getMediaItems, getDirectorySize, hasNotErr, run, zenity } = require('./helpers')

async function detectPluggedUsb () {
  const mediaItemsBefore = getMediaItems()
  try {
    zenity(
      `--info --text='Считаны текущие подключенные устройства.\\n\\nВставьте флешку или жесткий диск, куда необходимо записать резервную копию пользовательских данных и после того как она определится системой — нажмите "ОК"'`
    )
  } catch (err) {
    process.exit(0)
  }

  const mediaItemsAfter = getMediaItems()
  const newItems = without(mediaItemsAfter, ...mediaItemsBefore)
  if (newItems.length > 1) {
    run(
      `zenity --warn --width=300 --text='Обнаружено сразу несколько новых устройств!\\n\\nРезервная копия будет записана на накопитель с наибольшей свободной памятью'`
    )
  } else if (!newItems.length) {
    zenity("--error --text='Не обнаружено ни одного нового подключенного устройства!'")
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


  const homeFilesHumanSize = getDirectorySize(HOME_DIR)
  const homeFilesSize = humanFormat.parse(homeFilesHumanSize)

  let availableSizeInDevice = device.size
  const pathToPrevBackup = `${device.path}/${BACKUP_DIRECTORY_NAME}`
  const hasPrevBackup = hasNotErr(pathToPrevBackup)
  if (hasPrevBackup) {
    const backupDirectoryHumanSize = getDirectorySize(pathToPrevBackup)
    availableSizeInDevice += humanFormat.parse(backupDirectoryHumanSize)
  }

  if (homeFilesSize >= availableSizeInDevice) {
    const humanAvailableSizeInDevice = humanFormat(availableSizeInDevice).replace(' ', '')
    zenity(
      `--error --text='Не могу записать!\\n\\nСлишком мало места для записи данных.\\nНужно: "${homeFilesHumanSize}", а доступно только: "${humanAvailableSizeInDevice}"'`
    )
    process.exit(0)
  }

  if (hasPrevBackup) {
    zenity(
      `rm -rf ${pathToPrevBackup} | zenity --progress --pulsate --auto-close --auto-kill --text="<b>Не вынимать накопитель!</b>\\n\\tУдаление прошлой резервной копии..."`
    )
  }

    zenity(
      `cp -r ${HOME_DIR} ${pathToPrevBackup} | zenity --progress --pulsate --auto-close --auto-kill --text="<b>Не вынимать накопитель!</b>\\n\\tСоздание новой резервной копии...`
    )
    zenity("--info --text='Создание резервной копии успешно завершено.\\nМожно извлечь накопитель.'")
  process.exit(0)
}

function restoreBackup () {
  console.log(`|42| restoreBackup`)
}

async function main () {
  const MAKE_BACKUP = 'MAKE_BACKUP'
  const RESTORE_BACKUP = 'RESTORE_BACKUP'
  const response = zenity(
    `--list --radiolist --title "Выбор действия" --text "Что необходимо сделать?" --column "" --column "" --column "Действие" FALSE "${MAKE_BACKUP}" "Создать резервную копию" FALSE "${RESTORE_BACKUP}" "Восстановить резервную копию" --hide-column 2`,
    { stdio: 'pipe' }
  )
    .toString()
    .trim()

  switch (response) {
    case MAKE_BACKUP:
      await makeBackup()
      break
    case RESTORE_BACKUP:
      restoreBackup()
      break

    default:
      break
  }
}

main()
