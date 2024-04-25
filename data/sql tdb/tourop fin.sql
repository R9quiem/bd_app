SELECT 
  SUM(Routes.ticket_price) AS profit
FROM
  Flights
  INNER JOIN Routes ON (Flights.route_id = Routes.route_id)
