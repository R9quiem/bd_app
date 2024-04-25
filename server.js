const express = require('express');
const queries = require('./services/queries');

const app = express();
const port = 3000;

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
app.get('/tours', async (req, res) => {
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

