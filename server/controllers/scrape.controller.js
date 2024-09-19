// import * as cheerio from 'cheerio'
// import { chromium } from 'playwright'

// const isProduction = process.env.NODE_ENV === 'production'

// // No es necesario especificar el path del navegador con Playwright
// console.log('isProduction', isProduction)

// export const getScraping = async (req, res) => {
//   const { url } = req.body
//   console.log('Launching Playwright...')

//   try {
//     // Lanza el navegador con Playwright
//     const browser = await chromium.launch({
//       headless: true, // Puedes cambiar a false si necesitas ver el navegador
//       args: ['--disable-setuid-sandbox', '--no-sandbox']
//     })
//     console.log('Playwright launched!')

//     const page = await browser.newPage()

//     // Interceptar solicitudes para bloquear imágenes, fuentes y hojas de estilo
//     await page.route('**/*', (route) => {
//       const resourceType = route.request().resourceType()
//       if (['image', 'stylesheet', 'font', 'png', 'jpg', 'jpeg'].includes(resourceType)) {
//         route.abort() // Bloquear solicitudes de imágenes, fuentes y hojas de estilo
//       } else {
//         route.continue() // Continuar con otras solicitudes
//       }
//     })

//     await page.goto(url, { waitUntil: 'networkidle' })
//     console.log('page is....', page)
//     // Esperar y seleccionar el span con la clase 'see-all-footer' y texto 'Ver todo'
//     const targetSelector = 'span.see-all-footer'

//     // Espera a que el selector esté disponible en el DOM
//     await page.waitForSelector(targetSelector, { timeout: 60000 })

//     // Evalúa dentro del navegador si hay al menos dos elementos con ese selector
//     const found = await page.evaluate(() => {
//       const elements = document.querySelectorAll('span.see-all-footer')
//       if (elements.length > 1) {
//         elements[1].click() // Hacer clic en el segundo elemento "Ver todo"
//         return true
//       }
//       return false
//     })

//     if (!found) {
//       console.log('No se encontró un segundo span con el texto "Ver todo"')
//       await browser.close()
//       return res.status(404).json({ error: 'No se encontró el botón "Ver todo"' })
//     }

//     if (!found) {
//       console.log('No se encontró un span con el texto "Ver todo"')
//       await browser.close()
//       return res
//         .status(404)
//         .json({ error: 'No se encontró el botón "Ver todo"' })
//     }

//     // Esperar a que se cargue el contenido después de hacer clic
//     await new Promise((resolve) => setTimeout(resolve, 2000)) // Reemplazo de waitForTimeout

//     // Obtener el HTML actualizado
//     const content = await page.content()
//     await browser.close()

//     // Ahora usa Cheerio para analizar el HTML y extraer los datos
//     const $ = cheerio.load(content)

//     // Seleccionar el div con la clase dinámica usando parte del nombre de la clase
//     const homeScore = $('div[class*="  game-score_competitor_score_container"]')
//       .first()
//       .text()
//       .trim()
//     const awayScore = $(
//       'div[class*="game-score_away_competitor_score_container"]'
//     )
//       .first()
//       .text()
//       .trim()

//     // Remates a Puerta
//     const shotsToGoalDiv = $(
//       'div.bar-chart-name-label:contains("Remates a Puerta")'
//     ).parent()
//     const homeShotsToGoal = shotsToGoalDiv
//       .find('div.bar-chart-label')
//       .first()
//       .text()
//     const awayShotsToGoal = shotsToGoalDiv
//       .find('div.bar-chart-label')
//       .last()
//       .text()

//     // Total Remates
//     const totalShotsDiv = $(
//       'div.bar-chart-name-label:contains("Total Remates")'
//     ).parent()
//     const homeTotalShots = totalShotsDiv
//       .find('div.bar-chart-label')
//       .first()
//       .text()
//     const awayTotalShots = totalShotsDiv
//       .find('div.bar-chart-label')
//       .last()
//       .text()

//     // Saques de esquina
//     const cornerslDiv = $(
//       'div.bar-chart-name-label:contains("Saques de Esquina")'
//     ).parent()
//     const homeCorners = cornerslDiv.find('div.bar-chart-label').first().text()
//     const awayCorners = cornerslDiv.find('div.bar-chart-label').last().text()

//     // Faltas
//     const faultsDiv = $('div.bar-chart-name-label:contains("Faltas")').parent()
//     const homeFaults = faultsDiv.find('div.bar-chart-label').first().text()
//     const awayFaults = faultsDiv.find('div.bar-chart-label').last().text()

//     // Amarillas
//     const yellowCardDiv = $(
//       'div.bar-chart-name-label:contains("Tarjetas Amarillas")'
//     ).parent()
//     const homeYellowCard = yellowCardDiv
//       .find('div.bar-chart-label')
//       .first()
//       .text()
//     const awayYellowCard = yellowCardDiv
//       .find('div.bar-chart-label')
//       .last()
//       .text()

//     // OffSide
//     const offsidesCardDiv = $(
//       'div.bar-chart-name-label:contains("Fueras de Juego")'
//     ).parent()
//     const homeOffsides = offsidesCardDiv
//       .find('div.bar-chart-label')
//       .first()
//       .text()
//     const awayOffsides = offsidesCardDiv
//       .find('div.bar-chart-label')
//       .last()
//       .text()

//     // Seleccionar el div con la clase dinámica usando parte del nombre de la clase para la posesión
//     const homePossession = $(
//       'div[class*="game-stats-widget_competitor_pie_chart"]'
//     )
//       .first()
//       .text()
//       .trim()
//       .replace('%', '')
//     const awayPossession = $(
//       'div[class*="game-stats-widget_competitor_pie_chart"]'
//     )
//       .last()
//       .text()
//       .trim()
//       .replace('%', '')

//     console.log('Goles - Local:', homeScore)
//     console.log('Goles - Visitante:', awayScore)
//     console.log('Corners - Local:', homeCorners)
//     console.log('Corners - Visitante:', awayCorners)
//     console.log('Remates a Puerta - Local:', homeShotsToGoal)
//     console.log('Remates a Puerta - Visitante:', awayShotsToGoal)
//     console.log('Total Remates - Local:', homeTotalShots)
//     console.log('Total Remates - Visitante:', awayTotalShots)
//     console.log('Faltas - Local:', homeFaults)
//     console.log('Faltas - Visitante:', awayFaults)
//     console.log('Amarillas - Local:', homeYellowCard)
//     console.log('Amarillas - Visitante:', awayYellowCard)
//     console.log('Offsides - Local:', homeOffsides)
//     console.log('Offsides - Visitante:', awayOffsides)
//     console.log('posesion - Local:', homePossession)
//     console.log('posesion - Visitante:', awayPossession)

//     res.json({
//       status: 'ok',
//       homeScore,
//       awayScore,
//       homeShotsToGoal,
//       awayShotsToGoal,
//       homeTotalShots,
//       awayTotalShots,
//       homeCorners,
//       awayCorners,
//       homeFaults,
//       awayFaults,
//       homeYellowCard,
//       awayYellowCard,
//       homeOffsides,
//       awayOffsides,
//       homePossession,
//       awayPossession
//     })
//   } catch (error) {
//     console.error('Error al hacer scraping:', error)
//     res.status(500).json({
//       error: 'Error al hacer scraping de la URL',
//       message: error.message // Incluye el mensaje de error si es útil para el diagnóstico
//     })
//   }
// }

import * as cheerio from 'cheerio'
import { chromium } from 'playwright'

export const getScraping = async (req, res) => {
  const { url } = req.body
  console.log('URL', url)
  try {
    // Lanzar el navegador con Playwright
    const browser = await chromium.launch({
      headless: true, // Puedes cambiar a false si quieres ver el navegador
      args: ['--disable-setuid-sandbox', '--no-sandbox']
    })

    const page = await browser.newPage()
    await page.goto(url, { waitUntil: 'networkidle' })

    // Obtener el contenido de la página
    const content = await page.content()
    await browser.close()

    // Cargar el contenido con Cheerio
    const $ = cheerio.load(content)

    // Obtener el marcador desde el contenedor principal
    // Usamos el selector más general para obtener los resultados por la estructura:
    const scores = $('span.imso_mh__score > span')

    // Verificamos que tengamos dos resultados para local y visitante
    const homeScore = $(scores[0]).text().trim()
    const awayScore = $(scores[1]).text().trim()

    // Seleccionar las filas de la tabla
    const rows = $('tbody tr')
    console.log('ROW', rows)
    // Almacenar los datos de la tabla
    // Almacenar los datos de la tabla
    const data = {
      homeScore,
      awayScore
    }

    // Mapear cada fila a la estadística correspondiente
    rows.each((index, row) => {
      const cells = $(row).find('td, th') // Seleccionar columnas de cada fila
      const homeValue = $(cells[0]).text().trim() // Columna para el equipo local
      const statLabel = $(cells[1]).text().trim() // Columna central con el tipo de estadística
      const awayValue = $(cells[2]).text().trim() // Columna para el equipo visitante

      switch (statLabel) {
        case 'Remates':
          data.homeTotalShots = homeValue
          data.awayTotalShots = awayValue
          break
        case 'Remates al arco':
          data.homeShotsToGoal = homeValue
          data.awayShotsToGoal = awayValue
          break
        case 'Posesión':
          data.homePossession = homeValue.replace('%', '')
          data.awayPossession = awayValue.replace('%', '')
          break
        case 'Pases':
          data.homePasses = homeValue
          data.awayPasses = awayValue
          break
        case 'Precisión de los pases':
          data.homePassAccuracy = homeValue.replace('%', '')
          data.awayPassAccuracy = awayValue.replace('%', '')
          break
        case 'Faltas':
          data.homeFaults = homeValue
          data.awayFaults = awayValue
          break
        case 'Tarjetas amarillas':
          data.homeYellowCard = homeValue
          data.awayYellowCard = awayValue
          break
        case 'Tarjetas rojas':
          data.homeRedCard = homeValue
          data.awayRedCard = awayValue
          break
        case 'Posición adelantada':
          data.homeOffsides = homeValue
          data.awayOffsides = awayValue
          break
        case 'Tiros de esquina':
          data.homeCorners = homeValue
          data.awayCorners = awayValue
          break
        default:
          break
      }
    })
    console.log('Goles - Local:', data.homeScore)
    console.log('Goles - Visitante:', data.awayScore)
    console.log('Corners - Local:', data.homeCorners)
    console.log('Corners - Visitante:', data.awayCorners)
    console.log('Remates a Puerta - Local:', data.homeShotsToGoal)
    console.log('Remates a Puerta - Visitante:', data.awayShotsToGoal)
    console.log('Total Remates - Local:', data.homeTotalShots)
    console.log('Total Remates - Visitante:', data.awayTotalShots)
    console.log('Faltas - Local:', data.homeFaults)
    console.log('Faltas - Visitante:', data.awayFaults)
    console.log('Amarillas - Local:', data.homeYellowCard)
    console.log('Amarillas - Visitante:', data.awayYellowCard)
    console.log('Offsides - Local:', data.homeOffsides)
    console.log('Offsides - Visitante:', data.awayOffsides)
    console.log('posesion - Local:', data.homePossession)
    console.log('posesion - Visitante:', data.awayPossession)
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
