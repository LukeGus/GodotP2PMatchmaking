import * as rl from 'node:readline/promises'
import * as chp from 'node:child_process'

function sleep (t) {
  return new Promise(resolve => setTimeout(resolve, t))
}

/**
* Run taplog
* @param {string} tapFormat Command for TAP formatting
* @param {string} logFormat Command for log formatting
*/
async function taplog (tapFormat, logFormat) {
  const reader = rl.createInterface({
    input: process.stdin
  })

  const tapLines = []
  const tap = chp.exec(tapFormat)
  const log = chp.exec(logFormat)

  let testPass = true

  tap.stdout.pipe(process.stdout)
  log.stdout.pipe(process.stdout)

  reader.on('line', line => {
    const logRegex = /^\s*#*\s*{/
    const failRegex = /\s*not ok \d+/

    if (logRegex.test(line)) {
      log.stdin.write(line.replace(logRegex, '{') + '\n')
    } else {
      tapLines.push(line)

      testPass &&= !failRegex.test(line)
    }
  })

  reader.on('close', async () => {
    tapLines.forEach(line => tap.stdin.write(line + '\n'))
    await sleep(25)

    tap.kill()
    log.kill()

    process.exit(testPass ? 0 : 1)
  })
}

taplog(process.argv[2], process.argv[3])
