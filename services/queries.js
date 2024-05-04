const db = require('./database');
const constants = require("constants");
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
  function convertWeekToDate(weekString) {// Разбиваем строку по дефису
    const parts = weekString.split('-');
    // Получаем год и номер недели
    const year = parseInt(parts[0]);
    const week = parseInt(parts[1]);
    // Получаем дату первого дня недели
    const date = new Date(year, 0, 1 + (week - 1) * 7);
    // Получаем день недели
    const dayOfWeek = date.getDay();
    // Вычитаем дни до понедельника текущей недели
    date.setDate(date.getDate() - dayOfWeek + 1);
    // Форматируем дату в строку 'yyyy-mm-dd'
    const formattedDate = date.toISOString().slice(0, 10);
    return formattedDate;  }
  try {
    // Вставка данных о заказанном туре
    const ordered_tour_id = await runQuery(
    `            
            INSERT INTO OrderedTours (tour_id,client_id, tour_start_week, number_of_people, booking_date)
            VALUES (?, ?, ?, ?,datetime('now'));`
        ,[req.tour_id,req.client_id,req.start_week,req.number_of_people]
  );
    await runQuery(
    ` 
            INSERT INTO Flights (departure_date,route_id)
            SELECT date(?,'+' || rd.day_of_week_id || ' days'),r.route_id
            FROM OrderedTours ot
            JOIN TourRoutes tr ON ot.tour_id = tr.tour_id            
            JOIN Routes r ON r.route_id = tr.route_id
            JOIN RouteDays rd ON rd.route_id = r.route_id            
            WHERE ot.ordered_tour_id = ?;
            `,[convertWeekToDate(req.start_week),ordered_tour_id.lastID]);
    await runQuery(
        `
            INSERT INTO OrderedFlights (ordered_tour_id,flight_id)
            SELECT ot.ordered_tour_id, f.flight_id            
            FROM OrderedTours ot
            JOIN TourRoutes tr ON ot.tour_id = tr.tour_id            
            JOIN Routes r ON r.route_id = tr.route_id
            JOIN Flights f ON f.route_id = r.route_id            
            WHERE ot.ordered_tour_id = ?
        `, [ordered_tour_id.lastID]
    );
  } catch (error) {
    console.error('Error:', error.message);
    throw new Error('Failed to add ordered tour and ordered flights');
  }
}
async function registerClient(req) {
  try {
    // Вставка данных о заказанном туре
    const client = await runQuery(
        `
            INSERT INTO Clients (name,password,email,registration_date)
            VALUES (?, ?, ?, datetime('now'));`
        ,[req.name,req.password,req.email]
    );
    return client.lastID;

  } catch (error) {
    console.error('Error:', error.message);
    throw new Error('Failed to add register user');
  }
}
async function loginClient(req) {
  try {
    // Вставка данных о заказанном туре
    const client = await getQuery(
        `
            SELECT * FROM Clients
            WHERE email = ? and password = ?;`
        ,[req.email,req.password]
    );
    return client.id;
  } catch (error) {
    console.error('Error:', error.message);
    throw new Error('Failed to add login user');
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
        left JOIN Refunds rf ON rf.ordered_tour_id = ot.ordered_tour_id
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


async function addRefund(req) {
  try {
    console.log(req)
    return await runQuery(
      `
      INSERT INTO Refunds (ordered_tour_id,refund_date)
      VALUES (?,date(?))`
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
        SELECT ot.ordered_tour_id,ot.tour_id, a.city, ot.tour_start_week
        FROM OrderedTours ot
        JOIN TourRoutes tr ON tr.tour_id = ot.tour_id
        JOIN Routes r ON r.route_id = tr.route_id
        JOIN Airports a ON r.departure_airport_id = a.airport_id or r.destination_airport_id = a.airport_id
        WHERE ot.tour_start_week BETWEEN ? and ? AND a.city = ?
        GROUP BY ot.tour_id
      `,
      [  req.start,req.end,req.city]
    );
  } catch (error) {
    console.error('Error:', error.message);
    throw new Error('Failed to get tours by date and city');
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
          SUM(r.ticket_price*ot.number_of_people*0.9) as 'all',
          SUM(CASE
          WHEN rf.refund_date=f.departure_date and tr.route_number_in_tour=1 then r.ticket_price*OT.number_of_people*0.9*0.5
          WHEN rf.refund_id is not null then r.ticket_price*OT.number_of_people*0.9
          end) as losses,
          SUM(CASE
          WHEN rf.refund_date=f.departure_date and tr.route_number_in_tour=1 then r.ticket_price*OT.number_of_people*0.25
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
     return  await allQuery(
      `
          SELECT
          SUM(r.ticket_price*ot.number_of_people*0.1) as 'all',
          SUM(CASE
          WHEN rf.refund_date=f.departure_date and tr.route_number_in_tour=1 then r.ticket_price*OT.number_of_people*0.25
          WHEN rf.refund_id is not null then r.ticket_price*OT.number_of_people*0.1
          end) as losses,
          SUM(CASE
          WHEN rf.refund_date=f.departure_date and tr.route_number_in_tour=1 then r.ticket_price*OT.number_of_people*0.25
          WHEN rf.refund_id is null then r.ticket_price*ot.number_of_people*0.1
          ELSE 0
          end) as touroperator_profit
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
  } catch (error) {
    console.error('Error:', error.message);
    throw new Error('Failed to get fin report for touroperator');
  }
}

async function getTours() {
  try {
    return await allQuery(
        `
          SELECT * FROM Tours
      `
    );
  } catch (error) {
    console.error('Error:', error.message);
    throw new Error('Failed to get tours');
  }
}
async function getRefunds() {
  try {
    return await allQuery(
      `
          SELECT * FROM Refunds
      `
    );
  } catch (error) {
    console.error('Error:', error.message);
    throw new Error('Failed to get refunds');
  }
}
async function getOrderedTour(ordered_tour_id) {
  try {
    const ordered_tour = await getQuery(
      `
          SELECT * FROM OrderedTours ot
          where ot.ordered_tour_id = ?
      `,[ordered_tour_id]
    );
    return ordered_tour.ordered_tour_id
  } catch (error) {
    console.error('Error:', error.message);
    throw new Error('Failed to get ordered tours');
  }
}
async function getClientTours(client_id) {
  try {
    return await allQuery(
      `
          SELECT * FROM OrderedTours ot 
          where ot.client_id = ?
      `,[client_id]
    );
  } catch (error) {
    console.error('Error:', error.message);
    throw new Error('Failed to get Client Tours');
  }
}

async function getTourRoutes(tour_id) {
  try {
    return await allQuery(
        `
          select r.route_id, tr.route_number_in_tour,(select a.city from Airports a where a.airport_id = r.departure_airport_id) as departure_city,(select a.city from Airports a where a.airport_id = r.destination_airport_id) as destination_city,r.plane_id,r.departure_time,r.flight_duration,r.ticket_price
          from Tours t
          JOIN TourRoutes tr ON t.tour_id = tr.tour_id
          join Routes r ON r.route_id = tr.route_id
          where t.tour_id = ?
          order by tr.route_number_in_tour
      `,[tour_id]
    );
  } catch (error) {
    console.error('Error:', error.message);
    throw new Error('Failed to get tourRoutes');
  }
}
async function getOrderedTourFlights(tour_id) {
  try {
    return await allQuery(
      `
          select r.route_id, tr.route_number_in_tour,(select a.city from Airports a where a.airport_id = r.departure_airport_id) as departure_city,(select a.city from Airports a where a.airport_id = r.destination_airport_id) as destination_city,r.plane_id,r.departure_time,r.flight_duration,r.ticket_price, f.departure_date
          from OrderedTours ot
          JOIN Tours t ON ot.tour_id=t.tour_id
          JOIN TourRoutes tr ON t.tour_id = tr.tour_id and f.route_id=tr.route_id
          join Routes r ON r.route_id = tr.route_id
          JOIN OrderedFlights of ON of.ordered_tour_id = ot.ordered_tour_id
          JOIN Flights f ON f.flight_id = of.flight_id
          where ot.ordered_tour_id = ?
          order by tr.route_number_in_tour
      `,[tour_id]
    );
  } catch (error) {
    console.error('Error:', error.message);
    throw new Error('Failed to get OrderedTourFlights');
  }
}
async function getCities() {
  try {
    return await allQuery(
      `
          SELECT * FROM Airports
      `
    );
  } catch (error) {
    console.error('Error:', error.message);
    throw new Error('Failed to get Cities');
  }
}
async function airlineAdd(number) {
  try {
    for(let i = 0; i < number; i++)
    {
      await runQuery(
        `
          INSERT into Airlines (name)
          values (?)
      `,[`Airline ${i}`]
      );
    }
    return "success";
  } catch (error) {
    console.error('Error:', error.message);
    throw new Error('Failed to add airlines');
  }
}



module.exports = {
  addOrderedTour,
  getOrderedTours,
  getFlightsByDateAndDirection,
  addRefund,
  getToursByDatePeriodAndCity,
  getFinReportAvia,
  getFinReportTourOperator,
  getTours,
  getTourRoutes,
  loginClient,
  registerClient,
  getClientTours,
  getOrderedTourFlights,
  getOrderedTour,
  getCities,
  getRefunds,
  airlineAdd
};