SELECT 
  Airports.city,
  Tours.tour_id,
  Flights.departure_date
FROM
  Flights,
  Tours,
  Airports
GROUP BY
  Airports.city,
  Flights.departure_date
