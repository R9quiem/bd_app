const db = require('./database');
function runQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.run(query, params, function(err) {
      if (err) {
        reject(err);
      } else {
        resolve(this);
      }
    });
  });
}

function allQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.all(query, params, function(err,rows) {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

function getQuery(query, params = []) {
  return new Promise((resolve, reject) => {
    db.get(query, params, function(err,row) {
      if (err) {
        reject(err);
      } else {
        resolve(row);
      }
    });
  });
}
//todo нужно чтобы полеты были в правильном порядке и не было такого что полет следующий в туре идет перед прошлым (путешествие во времени)
//todo добавить транзакции
async function addOrderedTour(req) {
  try {
    // Вставка данных о заказанном туре
    const ordered_tour_id = await runQuery(
      `
            INSERT INTO OrderedTours (tour_id, tour_start_week, number_of_people, booking_date)
            VALUES (?, ?, ?, datetime('now'));`
      ,[req.tour_id,req.start_week,req.number_of_people]
    );

    // Вставка данных о полете для всех заказанных туров с tour_id = 1
    await runQuery(
      `
            INSERT INTO OrderedFlights (ordered_tour_id,flight_id)
            SELECT ot.ordered_tour_id, f.flight_id
            FROM OrderedTours ot
            JOIN TourRoutes tr ON ot.tour_id = tr.tour_id
            JOIN Routes r ON r.route_id = tr.route_id
            JOIN Flights f ON f.route_id = r.route_id
            WHERE ot.ordered_tour_id = ordered_tour_id
        `
    );
  } catch (error) {
    console.error('Error:', error.message);
    throw new Error('Failed to add ordered tour and ordered flights');
  }
}
async function getOrderedTours() {
  try {
    return await allQuery(
      `
      SELECT * FROM OrderedTours;
      `
    );
  } catch (error) {
    console.error('Error:', error.message);
    throw new Error('Failed to get orderedTours');
  }
}
async function getFlightsByDateAndDirection(req) {
  try {
    return await allQuery(
      `
      SELECT 
        f.flight_id, 
        f.departure_date, 
        a.city,
        (p.capacity - SUM(ot.number_of_people)) AS free_seats
      FROM
        Flights f
        JOIN OrderedFlights of ON of.flight_id = f.flight_id
        JOIN OrderedTours ot ON ot.ordered_tour_id = of.ordered_tour_id
        JOIN Routes r ON r.route_id = f.route_id
        JOIN Planes p ON p.plane_id = r.plane_id
        JOIN Airports a ON a.airport_id = r.destination_airport_id
      WHERE f.departure_date = ? AND a.city = ?
      GROUP BY f.flight_id
      `,
      [req.date, req.destination]
    );
  } catch (error) {
    console.error('Error:', error.message);
    throw new Error('Failed to get flights');
  }
}
/*
TODO: добавить проверку на то существует ли ordered tour (или она есть)
TODO: дата текущая должна быть
*/
async function addRefund(req) {
  try {
    console.log(req)
    return await runQuery(
      `
      INSERT INTO Refunds (ordered_tour_id,refund_date)
      VALUES (?,?)`
      ,
      [req.ordered_tour_id, req.refund_date]

    );
  } catch (error) {
    console.error('Error:', error.message);
    throw new Error('Failed to add refund');
  }
}

async function getToursByDatePeriodAndCity(req) {
  try {
    return await allQuery(
      `
      SELECT 
        Airports.city,
        Tours.tour_id,
        Flights.departure_date
      FROM
        Flights,
        Tours,
        Airports
      WHERE
        Airports.city = ? AND Flights.departure_date BETWEEN ? AND ?
      GROUP BY
        Airports.city,
        Flights.departure_date
      `,
      [ req.city, req.date.start,req.date.end]
    );
  } catch (error) {
    console.error('Error:', error.message);
    throw new Error('Failed to get tours');
  }
}
//TODO добавить проверку в refunds
async function getFinReportAvia(year) {
  try {
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    return await allQuery(
      `
        SELECT 
          Airlines.name,
          SUM(CASE WHEN Refunds.refund_date = Flights.departure_date THEN Routes.ticket_price * 0.5 WHEN Refunds.refund_date IS NOT NULL THEN 0 ELSE Routes.ticket_price END) AS profit
        FROM
          Flights
          INNER JOIN Routes ON (Flights.route_id = Routes.route_id)
          INNER JOIN Planes ON (Routes.plane_id = Planes.plane_id)
          INNER JOIN Airlines ON (Planes.airline_id = Airlines.airline_id),
          OrderedTours
          LEFT OUTER JOIN Refunds ON (OrderedTours.ordered_tour_id = Refunds.ordered_tour_id)
        WHERE Flights.departure_date BETWEEN ? AND ?
        GROUP BY
          Airlines.name
      `,
      [yearStart,yearEnd]
    );
  } catch (error) {
    console.error('Error:', error.message);
    throw new Error('Failed to get fin report for avia');
  }
}

async function getFinReportTourOperator(year) {
  try {
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
     let profit = await allQuery(
      `
        SELECT 
          SUM(Routes.ticket_price) AS profit
        FROM
          Flights
          INNER JOIN Routes ON (Flights.route_id = Routes.route_id),
          OrderedTours
        WHERE Flights.departure_date BETWEEN ? AND ?
      `,
      [yearStart,yearEnd]
    );
    profit = profit[0].profit * 0.1;
    return profit;
  } catch (error) {
    console.error('Error:', error.message);
    throw new Error('Failed to get fin report for touroperator');
  }
}

module.exports = {
  addOrderedTour,
  getOrderedTours,
  getFlightsByDateAndDirection,
  addRefund,
  getToursByDatePeriodAndCity,
  getFinReportAvia,
  getFinReportTourOperator
};