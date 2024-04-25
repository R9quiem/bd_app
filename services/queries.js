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
            WHERE ot.ordered_tour_id = ?
        `, [ordered_tour_id]
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
         a.city as destination_city,
         p.capacity,
         (p.capacity-SUM(CASE
         WHEN rf.refund_id is not null then ot.number_of_people
         ELSE 0
         END)) as free_seats
        FROM OrderedFlights of
        JOIN OrderedTours ot ON ot.ordered_tour_id = of.ordered_tour_id
        JOIN Refunds rf ON rf.ordered_tour_id = ot.ordered_tour_id
        JOIN Flights f ON of.flight_id = f.flight_id
        JOIN Routes r ON r.route_id = f.route_id
        JOIN Airports a ON a.airport_id = r.destination_airport_id
        JOIN Planes p ON p.plane_id = r.plane_id
        WHERE a.city = ? AND f.departure_date = ?
        GROUP BY f.flight_id
      `,
      [req.destination,req.date]
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
        SELECT ot.tour_id, a.city, ot.tour_start_week
        FROM OrderedTours ot
        JOIN TourRoutes tr ON tr.tour_id = ot.tour_id
        JOIN Routes r ON r.route_id = tr.route_id
        JOIN Airports a ON r.departure_airport_id = a.airport_id or r.destination_airport_id = a.airport_id
        WHERE ot.tour_start_week BETWEEN ? and ? AND a.city = ?
        GROUP BY ot.tour_id
      `,
      [  req.date.start,req.date.end,req.city]
    );
  } catch (error) {
    console.error('Error:', error.message);
    throw new Error('Failed to get tours');
  }
}
async function getFinReportAvia(year) {
  try {
    const yearStart = `${year}-01-01`;
    const yearEnd = `${year}-12-31`;
    return await allQuery(
      `
          SELECT
           a.name,
           SUM(CASE
           WHEN rf.refund_date=f.departure_date and tr.route_number_in_tour=1 then r.ticket_price*OT.number_of_people*0.5
           WHEN rf.refund_id is null then r.ticket_price*ot.number_of_people*0.9
           ELSE 0
           end) as airline_profit
          FROM
           OrderedFlights of
           JOIN OrderedTours ot ON of.ordered_tour_id = ot.ordered_tour_id
           LEFT JOIN Refunds rf ON rf.ordered_tour_id = ot.ordered_tour_id
           JOIN Flights f ON f.flight_id = of.flight_id
           JOIN Routes r ON r.route_id = f.route_id
           JOIN TourRoutes tr ON tr.tour_id = ot.tour_id and tr.route_id = r.route_id
           JOIN Planes p ON p.plane_id = r.plane_id
           JOIN Airlines a ON a.airline_id = p.airline_id
          WHERE f.departure_date BETWEEN ? and ?
          GROUP BY a.airline_id
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
          SELECT sum(CASE
          WHEN rf.refund_date=f.departure_date and tr.route_number_in_tour = 1 then r.ticket_price*ot.number_of_people*0.5
          WHEN rf.refund_id is null then r.ticket_price*ot.number_of_people*0.1
          ELSE 0
          END) as touroperator_profit
          FROM OrderedTours ot
          JOIN OrderedFlights of ON of.ordered_tour_id = ot.ordered_tour_id
          JOIN Flights f ON f.flight_id = of.flight_id
          JOIN Routes r ON r.route_id = f.route_id
          JOIN TourRoutes tr ON tr.route_id = r.route_id AND tr.tour_id = ot.tour_id
          left JOIN Refunds rf ON rf.ordered_tour_id = ot.ordered_tour_id
          WHERE ot.booking_date BETWEEN ? and ?
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