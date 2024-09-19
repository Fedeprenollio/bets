import * as cheerio from 'cheerio'
import { chromium } from 'playwright'

const isProduction = process.env.NODE_ENV === 'production'

// No es necesario especificar el path del navegador con Playwright
console.log('isProduction', isProduction)

export const getScraping = async (req, res) => {
  const { url } = req.body
  console.log('Launching Playwright...')

  try {
    // Lanza el navegador con Playwright
    const browser = await chromium.launch({
      headless: true, // Puedes cambiar a false si necesitas ver el navegador
      args: ['--disable-setuid-sandbox', '--no-sandbox']
    })
    console.log('Playwright launched!')

    const page = await browser.newPage()

    // Interceptar solicitudes para bloquear imágenes, fuentes y hojas de estilo
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType()
      if (['image', 'stylesheet', 'font', 'png', 'jpg', 'jpeg'].includes(resourceType)) {
        route.abort() // Bloquear solicitudes de imágenes, fuentes y hojas de estilo
      } else {
        route.continue() // Continuar con otras solicitudes
      }
    })

    await page.goto(url, { waitUntil: 'networkidle' })
    console.log('page is....', page)
    // Esperar y seleccionar el span con la clase 'see-all-footer' y texto 'Ver todo'
    const targetSelector = 'span.see-all-footer'

    // Espera a que el selector esté disponible en el DOM
    await page.waitForSelector(targetSelector, { timeout: 60000 })

    // Evalúa dentro del navegador si hay al menos dos elementos con ese selector
    const found = await page.evaluate(() => {
      const elements = document.querySelectorAll('span.see-all-footer')
      if (elements.length > 1) {
        elements[1].click() // Hacer clic en el segundo elemento "Ver todo"
        return true
      }
      return false
    })

    if (!found) {
      console.log('No se encontró un segundo span con el texto "Ver todo"')
      await browser.close()
      return res.status(404).json({ error: 'No se encontró el botón "Ver todo"' })
    }

    if (!found) {
      console.log('No se encontró un span con el texto "Ver todo"')
      await browser.close()
      return res
        .status(404)
        .json({ error: 'No se encontró el botón "Ver todo"' })
    }

    // Esperar a que se cargue el contenido después de hacer clic
    await new Promise((resolve) => setTimeout(resolve, 2000)) // Reemplazo de waitForTimeout

    // Obtener el HTML actualizado
    const content = await page.content()
    await browser.close()

    // Ahora usa Cheerio para analizar el HTML y extraer los datos
    const $ = cheerio.load(content)

    // Seleccionar el div con la clase dinámica usando parte del nombre de la clase
    const homeScore = $('div[class*="  game-score_competitor_score_container"]')
      .first()
      .text()
      .trim()
    const awayScore = $(
      'div[class*="game-score_away_competitor_score_container"]'
    )
      .first()
      .text()
      .trim()

    // Remates a Puerta
    const shotsToGoalDiv = $(
      'div.bar-chart-name-label:contains("Remates a Puerta")'
    ).parent()
    const homeShotsToGoal = shotsToGoalDiv
      .find('div.bar-chart-label')
      .first()
      .text()
    const awayShotsToGoal = shotsToGoalDiv
      .find('div.bar-chart-label')
      .last()
      .text()

    // Total Remates
    const totalShotsDiv = $(
      'div.bar-chart-name-label:contains("Total Remates")'
    ).parent()
    const homeTotalShots = totalShotsDiv
      .find('div.bar-chart-label')
      .first()
      .text()
    const awayTotalShots = totalShotsDiv
      .find('div.bar-chart-label')
      .last()
      .text()

    // Saques de esquina
    const cornerslDiv = $(
      'div.bar-chart-name-label:contains("Saques de Esquina")'
    ).parent()
    const homeCorners = cornerslDiv.find('div.bar-chart-label').first().text()
    const awayCorners = cornerslDiv.find('div.bar-chart-label').last().text()

    // Faltas
    const faultsDiv = $('div.bar-chart-name-label:contains("Faltas")').parent()
    const homeFaults = faultsDiv.find('div.bar-chart-label').first().text()
    const awayFaults = faultsDiv.find('div.bar-chart-label').last().text()

    // Amarillas
    const yellowCardDiv = $(
      'div.bar-chart-name-label:contains("Tarjetas Amarillas")'
    ).parent()
    const homeYellowCard = yellowCardDiv
      .find('div.bar-chart-label')
      .first()
      .text()
    const awayYellowCard = yellowCardDiv
      .find('div.bar-chart-label')
      .last()
      .text()

    // OffSide
    const offsidesCardDiv = $(
      'div.bar-chart-name-label:contains("Fueras de Juego")'
    ).parent()
    const homeOffsides = offsidesCardDiv
      .find('div.bar-chart-label')
      .first()
      .text()
    const awayOffsides = offsidesCardDiv
      .find('div.bar-chart-label')
      .last()
      .text()

    // Seleccionar el div con la clase dinámica usando parte del nombre de la clase para la posesión
    const homePossession = $(
      'div[class*="game-stats-widget_competitor_pie_chart"]'
    )
      .first()
      .text()
      .trim()
      .replace('%', '')
    const awayPossession = $(
      'div[class*="game-stats-widget_competitor_pie_chart"]'
    )
      .last()
      .text()
      .trim()
      .replace('%', '')

    console.log('Goles - Local:', homeScore)
    console.log('Goles - Visitante:', awayScore)
    console.log('Corners - Local:', homeCorners)
    console.log('Corners - Visitante:', awayCorners)
    console.log('Remates a Puerta - Local:', homeShotsToGoal)
    console.log('Remates a Puerta - Visitante:', awayShotsToGoal)
    console.log('Total Remates - Local:', homeTotalShots)
    console.log('Total Remates - Visitante:', awayTotalShots)
    console.log('Faltas - Local:', homeFaults)
    console.log('Faltas - Visitante:', awayFaults)
    console.log('Amarillas - Local:', homeYellowCard)
    console.log('Amarillas - Visitante:', awayYellowCard)
    console.log('Offsides - Local:', homeOffsides)
    console.log('Offsides - Visitante:', awayOffsides)
    console.log('posesion - Local:', homePossession)
    console.log('posesion - Visitante:', awayPossession)

    res.json({
      status: 'ok',
      homeScore,
      awayScore,
      homeShotsToGoal,
      awayShotsToGoal,
      homeTotalShots,
      awayTotalShots,
      homeCorners,
      awayCorners,
      homeFaults,
      awayFaults,
      homeYellowCard,
      awayYellowCard,
      homeOffsides,
      awayOffsides,
      homePossession,
      awayPossession
    })
  } catch (error) {
    console.error('Error al hacer scraping:', error)
    res.status(500).json({
      error: 'Error al hacer scraping de la URL',
      message: error.message // Incluye el mensaje de error si es útil para el diagnóstico
    })
  }
}
