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
WHERE f.departure_date = '2024-04-30' AND a.city = 'City C'
GROUP BY f.flight_id