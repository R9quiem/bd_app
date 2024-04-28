const express = require('express');
const queries = require('./services/queries');
const cors = require('cors');
const app = express();
const port = 8080;
app.use(cors());
app.use(express.json());
//app.use('/api', routes);

// Обработчик POST-запроса для добавления заказанного тура
app.post('/ordered-tours', async (req, res) => {
  try {
    const message = await queries.addOrderedTour(req.body);
    res.json(message);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/ordered-tours', async (req, res) => {
  try {
    const data = await queries.getOrderedTours();
    res.json(data);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});

app.get('/flights', async (req, res) => {
  try {
    const params = {
      date: req.query.date,
      destination: req.query.destination
    }
    const data = await queries.getFlightsByDateAndDirection(params);
    res.json(data);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
app.post('/refund', async (req, res) => {
  try {
    const data = await queries.addRefund(req.body);
    res.json(data);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
app.post('/registration', async (req, res) => {
  try {
    const client_id = await queries.registerClient(req.body);
    res.json(client_id);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
app.get('/login', async (req, res) => {
  try {
    const params = {
      email: req.query.email,
      password: req.query.password
    }
    const client_id = await queries.loginClient(params);
    res.json(client_id);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
app.get('/tours-by-date-and-city', async (req, res) => {
  try {
    const params = {
      city: req.query.city,
      start: req.query.start,
      end: req.query.end
    }
    const data = await queries.getToursByDatePeriodAndCity(params);
    res.json(data);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
app.get('/tours', async (req, res) => {
  try {
    const data = await queries.getTours();
    res.json(data);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
app.get('/tour-routes/:id', async (req, res) => {
  try {
    const tour_id = req.params.id;
    const data = await queries.getTourRoutes(tour_id);
    res.json(data);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
app.get('/fin-report-avia', async (req, res) => {
  try {
    const data = await queries.getFinReportAvia(req.query.year);
    res.json(data);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
app.get('/fin-report-touroperator', async (req, res) => {
  try {
    const data = await queries.getFinReportTourOperator(req.query.year);
    res.json(data);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});
// Запуск сервера
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

