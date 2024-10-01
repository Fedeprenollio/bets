import * as cheerio from 'cheerio'
import { chromium } from 'playwright'

export const scrapeMatchData = async (url) => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--disable-setuid-sandbox',
      '--no-sandbox',
      '--disable-gpu',
      '--no-zygote',
      '--disable-dev-shm-usage',
      '--disable-webgl'
    ]
  })

  const page = await browser.newPage()

  try {
    // Interceptar y bloquear imágenes, CSS y fuentes para optimizar el scraping
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType()
      if (['image', 'stylesheet', 'font'].includes(resourceType)) {
        route.abort()
      } else {
        route.continue()
      }
    })

    await page.goto(url, { waitUntil: 'domcontentloaded' })

    // Esperar a que los selectores clave estén presentes
    await page.waitForSelector('span.imso_mh__score > span', { timeout: 60000 })
    await page.waitForSelector('table.lr-imso-ss-wdt', { timeout: 60000 })

    // Extraer los datos adicionales de la tabla
    const additionalData = await page.evaluate(() => {
      const table = document.querySelector('table.lr-imso-ss-wdt')
      const rows = table.querySelectorAll('tr')

      return {
        homeTotalShots: rows[1]?.querySelectorAll('td')[0]?.innerText || 0,
        awayTotalShots: rows[1]?.querySelectorAll('td')[1]?.innerText || 0,
        homeShotsToGoal: rows[2]?.querySelectorAll('td')[0]?.innerText || 0,
        awayShotsToGoal: rows[2]?.querySelectorAll('td')[1]?.innerText || 0,
        homePossession: rows[3]?.querySelectorAll('td')[0]?.innerText.replace('%', '') || 0,
        awayPossession: rows[3]?.querySelectorAll('td')[1]?.innerText.replace('%', '') || 0,
        homePasses: rows[4]?.querySelectorAll('td')[0]?.innerText || 0,
        awayPasses: rows[4]?.querySelectorAll('td')[1]?.innerText || 0,
        homeAccuracy: rows[5]?.querySelectorAll('td')[0]?.innerText || 0,
        awayAccuracy: rows[5]?.querySelectorAll('td')[1]?.innerText || 0,
        homeFaults: rows[6]?.querySelectorAll('td')[0]?.innerText || 0,
        awayFaults: rows[6]?.querySelectorAll('td')[1]?.innerText || 0,
        homeYellowCard: rows[7]?.querySelectorAll('td')[0]?.innerText || 0,
        awayYellowCard: rows[7]?.querySelectorAll('td')[1]?.innerText || 0,
        homeRedCard: rows[8]?.querySelectorAll('td')[0]?.innerText || 0,
        awayRedCard: rows[8]?.querySelectorAll('td')[1]?.innerText || 0,
        homeOffsides: rows[9]?.querySelectorAll('td')[0]?.innerText || 0,
        awayOffsides: rows[9]?.querySelectorAll('td')[1]?.innerText || 0,
        homeCorners: rows[10]?.querySelectorAll('td')[0]?.innerText || 0,
        awayCorners: rows[10]?.querySelectorAll('td')[1]?.innerText || 0
      }
    })

    const content = await page.content()
    const $ = cheerio.load(content)

    // Obtener los resultados del marcador (goles)
    const scores = $('span.imso_mh__score > span')
    const homeScore = $(scores[0]).text().trim()
    const awayScore = $(scores[1]).text().trim()

    await browser.close()
    console.log('DATA A PROBAR:', {
      homeScore,
      awayScore,
      ...additionalData
    })
    return {
      homeScore,
      awayScore,
      ...additionalData
    }
  } catch (error) {
    console.error('Error durante el scraping:', error)
    await browser.close()
    throw new Error('Scraping error: ' + error.message)
  }
}
