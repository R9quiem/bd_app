SELECT 
  Airlines.airline_id,
  Airlines.name,
  SUM(Routes.ticket_price) AS profit
FROM
  Flights
  INNER JOIN Routes ON (Flights.route_id = Routes.route_id)
  INNER JOIN Planes ON (Routes.plane_id = Planes.plane_id)
  INNER JOIN Airlines ON (Planes.airline_id = Airlines.airline_id)
GROUP BY
  Airlines.airline_id,
  Airlines.name
