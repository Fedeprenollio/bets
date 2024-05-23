import { Router } from 'express'
import { methods as matchController } from '../controllers/match.controller.js'
import { verifyToken } from '../middleware/verifyToken .js'

export const matchRouter = Router()

matchRouter.get('/', matchController.getAllMatches)
matchRouter.post('/', verifyToken, matchController.createMatch)
matchRouter.put('/:id/result', verifyToken, matchController.updateMatchResult)
matchRouter.get('/:id', matchController.getMatchById)
matchRouter.get('/team/:idTeam', matchController.getMatchesByTeamId)
matchRouter.get('/statsAc/:idTeam', matchController.getTeamStats)
matchRouter.get('/team-stats/:seasonId', matchController.getTeamStatsForSeason)

matchRouter.delete('/:id', matchController.deleteMatchById)
matchRouter.put('/:id', verifyToken, matchController.updateMatchById)

// import { Router } from "express";
// import { Match } from "../../schemas/match.js";
// import { Team } from "../../schemas/team.js";
// import { League } from "../../schemas/leagueSchema.js";

// export const matchRouter = Router();

// matchRouter.get("/", async (req, res) => {
//   try {
//   } catch (error) {
//     console.error("Error fetching matches:", error);
//     res.status(500).send("An error occurred while fetching matches");
//   }
// });

// matchRouter.post("/", async (req, res) => {
//   try {
//   } catch (error) {
//     console.error("Error al crear el partido:", error);
//     res.status(500).send("Error al crear el partido");
//   }
// });

// matchRouter.put("/:id/result", async (req, res) => {
//   try {
//   } catch (error) {
//     res.status(400).send(error);
//   }
// });

// // Ruta para obtener un partido por su ID
// matchRouter.get("/:id", async (req, res) => {
//   try {
//   } catch (error) {
//     res.status(500).send(error);
//   }
// });

// // Obtener todos los partidos de un equipo
// matchRouter.get("/team/:idTeam", async (req, res) => {
//   try {
//   } catch (error) {
//     console.error("Error al buscar los partidos del equipo:", error);
//     res.status(500).send("Error al buscar los partidos del equipo");
//   }
// });

// matchRouter.get("/stats/:idTeam", async (req, res) => {
//   try {
//     const idTeam = req.params.idTeam;
//     const nameTeam = await Team.findById(idTeam);

//     // Obtener todos los partidos del equipo como local y como visitante
//     const homeMatches = await Match.find({ homeTeam: idTeam });
//     const awayMatches = await Match.find({ awayTeam: idTeam });

//     // Función para calcular las estadísticas
//     const calculateStats = (matches, statType, isHomeTeam) => {
//       const stats = {
//         matchesTotal: matches.length,
//         matchesWith0: 0,
//         matchesWith1: 0,
//         matchesWith2: 0,
//         matchesWith3: 0,
//         matchesWith4: 0,
//         matchesWith5: 0,
//         matchesWith6: 0,
//         matchesWith7: 0,
//         matchesWith8: 0,
//         matchesWith9: 0,
//         matchesWith10: 0,
//         matchesWithMoreThan10: 0,
//       };

//       matches.forEach((match) => {
//         const teamStats = isHomeTeam
//           ? match.teamStatistics.local
//           : match.teamStatistics.visitor;
//         const statValue = teamStats[statType];
//         if (statValue <= 10) {
//           stats[`matchesWith${statValue}`]++;
//         } else {
//           stats.matchesWithMoreThan10++;
//         }
//       });

//       return stats;
//     };

//     // Calcular estadísticas para cada tipo de estadística
//     const statsGoles = calculateStats(
//       [...homeMatches, ...awayMatches],
//       "goals",
//       true
//     );
//     const statsOffsides = calculateStats(
//       [...homeMatches, ...awayMatches],
//       "offsides",
//       true
//     );
//     const statsYellowCards = calculateStats(
//       [...homeMatches, ...awayMatches],
//       "yellowCards",
//       true
//     );
//     const statsRedCards = calculateStats(
//       [...homeMatches, ...awayMatches],
//       "redCards",
//       true
//     );
//     const statsCorners = calculateStats(
//       [...homeMatches, ...awayMatches],
//       "corners",
//       true
//     );

//     // Calcular los goles recibidos sumando los goles marcados por el equipo contrario en cada partido
//     const statsGolesRecibidosLocal = calculateStats(awayMatches, "goals", true);
//     const statsGolesRecibidosVisitante = calculateStats(
//       homeMatches,
//       "goals",
//       false
//     );
//     const statsGolesRecibidos = {
//       matchesTotal:
//         statsGolesRecibidosLocal.matchesTotal +
//         statsGolesRecibidosVisitante.matchesTotal,
//       matchesWith0:
//         statsGolesRecibidosLocal.matchesWith0 +
//         statsGolesRecibidosVisitante.matchesWith0,
//       matchesWith1:
//         statsGolesRecibidosLocal.matchesWith1 +
//         statsGolesRecibidosVisitante.matchesWith1,
//       matchesWith2:
//         statsGolesRecibidosLocal.matchesWith2 +
//         statsGolesRecibidosVisitante.matchesWith2,
//       matchesWith3:
//         statsGolesRecibidosLocal.matchesWith3 +
//         statsGolesRecibidosVisitante.matchesWith3,
//       matchesWith4:
//         statsGolesRecibidosLocal.matchesWith4 +
//         statsGolesRecibidosVisitante.matchesWith4,
//       matchesWith5:
//         statsGolesRecibidosLocal.matchesWith5 +
//         statsGolesRecibidosVisitante.matchesWith5,
//       matchesWith6:
//         statsGolesRecibidosLocal.matchesWith6 +
//         statsGolesRecibidosVisitante.matchesWith6,
//       matchesWith7:
//         statsGolesRecibidosLocal.matchesWith7 +
//         statsGolesRecibidosVisitante.matchesWith7,
//       matchesWith8:
//         statsGolesRecibidosLocal.matchesWith8 +
//         statsGolesRecibidosVisitante.matchesWith8,
//       matchesWith9:
//         statsGolesRecibidosLocal.matchesWith9 +
//         statsGolesRecibidosVisitante.matchesWith9,
//       matchesWith10:
//         statsGolesRecibidosLocal.matchesWith10 +
//         statsGolesRecibidosVisitante.matchesWith10,
//       matchesWithMoreThan10:
//         statsGolesRecibidosLocal.matchesWithMoreThan10 +
//         statsGolesRecibidosVisitante.matchesWithMoreThan10,
//     };

//     // Devolver los resultados en un solo objeto
//     const allStats = {
//       team: nameTeam.name,
//       goals: statsGoles,
//       goalsReceived: statsGolesRecibidos,
//       offsides: statsOffsides,
//       yellowCards: statsYellowCards,
//       redCards: statsRedCards,
//       corners: statsCorners,
//     };

//     res.status(200).json(allStats);
//   } catch (error) {
//     console.error("Error al obtener estadísticas del equipo:", error);
//     res.status(500).send("Error al obtener estadísticas del equipo");
//   }
// });

// matchRouter.get("/statsAc/:idTeam", async (req, res) => {
//   try {
//   } catch (error) {
//     console.error("Error al obtener estadísticas del equipo:", error);
//     res.status(500).send("Error al obtener estadísticas del equipo");
//   }
// });

// matchRouter.delete("/:id", async (req, res) => {
//   try {
//   } catch (error) {
//     console.error("Error al eliminar el partido:", error);
//     res.status(500).send("Error al eliminar el partido");
//   }
// });

// matchRouter.put("/:id", async (req, res) => {
//   try {
//   } catch (error) {
//     console.error("Error al actualizar el partido:", error);
//     res.status(500).send("Error al actualizar el partido");
//   }
// });
