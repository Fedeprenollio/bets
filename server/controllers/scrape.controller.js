import * as cheerio from 'cheerio'
import { chromium } from 'playwright'
export const getScraping = async (req, res) => {
  const { url } = req.body

  try {
    // Lanzar el navegador con Playwright
    const browser = await chromium.launch({
      headless: true, // Puedes cambiar a false si quieres ver el navegador
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
    // Interceptar solicitudes de red
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType()
      // Bloquear imágenes, CSS y fuentes
      if (resourceType === 'image' || resourceType === 'stylesheet' || resourceType === 'font') {
        route.abort()
      } else {
        route.continue()
      }
    })
    await page.goto(url, { waitUntil: 'domcontentloaded' })
    // Esperar a que los elementos del marcador estén disponibles
    await page.waitForSelector('span.imso_mh__score > span', { timeout: 60000 })
    // await page.waitForSelector('tbody tr', { state: 'visible', timeout: 60000 })

    // Esperar a que se cargue la tabla con la clase específica
    await page.waitForSelector('table.lr-imso-ss-wdt', { timeout: 60000 })

    // Extraer la tabla con la clase específica

    // Extraer los datos necesarios de la tabla
    const additionalData = await page.evaluate(() => {
      const table = document.querySelector('table.lr-imso-ss-wdt')
      const rows = table.querySelectorAll('tr')

      // Mapear los valores a las estadísticas
      const homeTotalShots = rows[1].querySelectorAll('td')[0].innerText
      const awayTotalShots = rows[1].querySelectorAll('td')[1].innerText

      const homeShotsToGoal = rows[2].querySelectorAll('td')[0].innerText
      const awayShotsToGoal = rows[2].querySelectorAll('td')[1].innerText

      const homePossession = rows[3].querySelectorAll('td')[0].innerText.replace('%', '')
      const awayPossession = rows[3].querySelectorAll('td')[1].innerText.replace('%', '')

      const homePasses = rows[4].querySelectorAll('td')[0].innerText
      const awayPasses = rows[4].querySelectorAll('td')[1].innerText

      const homeAccuracy = rows[5].querySelectorAll('td')[0].innerText
      const awayAccuracy = rows[5].querySelectorAll('td')[1].innerText

      const homeFaults = rows[6].querySelectorAll('td')[0].innerText
      const awayFaults = rows[6].querySelectorAll('td')[1].innerText

      const homeYellowCard = rows[7].querySelectorAll('td')[0].innerText
      const awayYellowCard = rows[7].querySelectorAll('td')[1].innerText

      const homeRedCard = rows[8].querySelectorAll('td')[0].innerText
      const awayRedCard = rows[8].querySelectorAll('td')[1].innerText

      const homeOffsides = rows[9].querySelectorAll('td')[0].innerText
      const awayOffsides = rows[9].querySelectorAll('td')[1].innerText

      const homeCorners = rows[10].querySelectorAll('td')[0].innerText
      const awayCorners = rows[10].querySelectorAll('td')[1].innerText

      return {
        homeTotalShots,
        awayTotalShots,
        homeShotsToGoal,
        awayShotsToGoal,
        homePossession,
        awayPossession,
        homePasses,
        awayPasses,
        homeAccuracy,
        awayAccuracy,
        homeFaults,
        awayFaults,
        homeYellowCard,
        awayYellowCard,
        homeRedCard,
        awayRedCard,
        homeOffsides,
        awayOffsides,
        homeCorners,
        awayCorners
      }
    })
    // Obtener el contenido de la página
    const content = await page.content()
    await browser.close()

    // Cargar el contenido con Cheerio
    const $ = cheerio.load(content)

    // Usamos el selector más general para obtener los resultados por la estructura:
    const scores = $('span.imso_mh__score > span')

    // Verificamos que tengamos dos resultados para local y visitante
    const homeScore = $(scores[0]).text().trim()
    const awayScore = $(scores[1]).text().trim()

    // Almacenar los datos de la tabla
    const data = {
      homeScore,
      awayScore,
      ...additionalData // Combina los datos adicionales extraídos
    }

    // console.log('Goles - Local:', data.homeScore)
    // console.log('Goles - Visitante:', data.awayScore)
    // console.log('Corners - Local:', data.homeCorners)
    // console.log('Corners - Visitante:', data.awayCorners)
    // console.log('Remates a Puerta - Local:', data.homeShotsToGoal)
    // console.log('Remates a Puerta - Visitante:', data.awayShotsToGoal)
    // console.log('Total Remates - Local:', data.homeTotalShots)
    // console.log('Total Remates - Visitante:', data.awayTotalShots)
    // console.log('Faltas - Local:', data.homeFaults)
    // console.log('Faltas - Visitante:', data.awayFaults)
    // console.log('Amarillas - Local:', data.homeYellowCard)
    // console.log('Amarillas - Visitante:', data.awayYellowCard)
    // console.log('Offsides - Local:', data.homeOffsides)
    // console.log('Offsides - Visitante:', data.awayOffsides)
    // console.log('posesion - Local:', data.homePossession)
    // console.log('posesion - Visitante:', data.awayPossession)
    // Enviar los datos finales
    res.json({
      status: 'ok',
      homeScore: data.homeScore || '',
      awayScore: data.awayScore || '',
      homeShotsToGoal: data.homeShotsToGoal || '',
      awayShotsToGoal: data.awayShotsToGoal || '',
      homeTotalShots: data.homeTotalShots || '',
      awayTotalShots: data.awayTotalShots || '',
      homeCorners: data.homeCorners || '',
      awayCorners: data.awayCorners || '',
      homeFaults: data.homeFaults || '',
      awayFaults: data.awayFaults || '',
      homeYellowCard: data.homeYellowCard || '',
      awayYellowCard: data.awayYellowCard || '',
      homeOffsides: data.homeOffsides || '',
      awayOffsides: data.awayOffsides || '',
      homePossession: data.homePossession || '',
      awayPossession: data.awayPossession || ''
    })
  } catch (error) {
    console.error('Error al hacer scraping:', error)
    res.status(500).json({
      error: 'Error al hacer scraping de la URL',
      message: error.message
    })
  }
}
