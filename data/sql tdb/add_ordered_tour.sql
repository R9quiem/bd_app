SELECT SUM(
	CASE
        WHEN rf.refund_date = f.departure_date and tr.route_number_in_tour = 1 THEN r.ticket_price*ot.number_of_people*0.5
        WHEN rf.refund_id is null THEN r.ticket_price*ot.number_of_people
        ELSE 0
    END
	) as total_profit,ot.ordered_tour_id
FROM
	OrderedFlights of
	JOIN Flights f ON f.flight_id = of.flight_id
	JOIN Routes r ON r.route_id = f.route_id
	JOIN OrderedTours ot ON of.ordered_tour_id = ot.ordered_tour_id
	JOIN TourRoutes tr ON ot.tour_id = tr.tour_id and tr.route_id = r.route_id
	LEFT JOIN Refunds rf on ot.ordered_tour_id = rf.ordered_tour_id
WHERE ot.booking_date BETWEEN '2024-01-01' and '2024-12-31'
GROUP BY ot.ordered_tour_id