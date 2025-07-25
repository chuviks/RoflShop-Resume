const express = require('express');
const path = require('path');
const fs = require('fs');
const url = require('url');
const { MongoClient, ObjectId } = require('mongodb');
const ejs = require('ejs');
const multer = require('multer');

const app = express();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'public/uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Только изображения (jpg, jpeg, png, gif)'));
  },
  limits: { fileSize: 5 * 1024 * 1024 }
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const mongoUrl = 'mongodb://localhost:27017';
const dbName = 'tshirt_store';
let db;

MongoClient.connect(mongoUrl)
  .then(client => {
    console.log('MongoDB подключён');
    db = client.db(dbName);
    initializeData();
  })
  .catch(err => console.error('Ошибка подключения к MongoDB:', err));

let loggedInUser = null;

const isAuthenticated = (req, res, next) => {
  if (loggedInUser) return next();
  console.log('Неавторизованный доступ к', req.url);
  res.status(401).redirect('/auth');
};

async function initializeData() {
  const users = await db.collection('users').find().toArray();
  if (users.length === 0) {
    await db.collection('users').insertOne({ email: 'admin@test.com', password: 'admin123' });
  }
  const tshirts = await db.collection('tshirtss').find().toArray();
  if (tshirts.length === 0) {
    await db.collection('tshirtss').insertMany([
      { name: 'Белая футболка с принтом', price: 19.99, color: 'Белый', size: 'M', image: '/uploads/exmpl1.jpg' },
      { name: 'Футболка с принтом', price: 21.99, color: 'Коричневый', size: 'L', image: '/uploads/exmpl2.jpg' },
      { name: 'Белая футболка с надписью', price: 16.99, color: 'Белый', size: 'S', image: '/uploads/exmpl3.jpg' },
      { name: 'Футболка с принтом', price: 21.99, color: 'Оранжевый', size: 'XL', image: '/uploads/exmpl4.jpg' },
      { name: 'Розовая футболка', price: 18.99, color: 'Розовый', size: 'M', image: '/uploads/exmpl5.jpg' }
    ]);
    console.log('Начальные футболки с изображениями добавлены');
  }
}

const isValidObjectId = (id) => {
  try {
    return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
  } catch {
    return false;
  }
};

app.get('/', async (req, res) => {
  try {
    const tshirts = await db.collection('tshirtss').find().toArray();
    res.status(200).set('Content-Type', 'text/html').render('index', { tshirts, user: loggedInUser });
  } catch (err) {
    console.error('Ошибка загрузки главной страницы:', err);
    res.status(500).send('Ошибка сервера');
  }
});

app.get('/contact', (req, res) => {
  res.status(200).set('Content-Type', 'text/html').render('contact', { user: loggedInUser });
});

app.post('/contact', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }
    await db.collection('feedback').insertOne({ name, email, message, created_at: new Date() });
    res.status(200).json({ message: 'Отзыв отправлен' });
  } catch (err) {
    console.error('Ошибка обработки отзыва:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/auth', (req, res) => {
  res.status(200).set('Content-Type', 'text/html').render('auth', { user: loggedInUser });
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Попытка входа:', { email });
    if (!email || !password) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }
    const user = await db.collection('users').findOne({ email, password });
    if (user) {
      loggedInUser = user;
      res.status(200).json({ message: 'Вход успешен', redirect: '/' });
    } else {
      res.status(401).json({ error: 'Неверные данные' });
    }
  } catch (err) {
    console.error('Ошибка входа:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;
    console.log('Попытка регистрации:', { email });
    if (!email || !password) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }
    await db.collection('users').insertOne({ email, password });
    res.status(200).json({ message: 'Регистрация успешна', redirect: '/auth' });
  } catch (err) {
    console.error('Ошибка регистрации:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/admin', isAuthenticated, async (req, res) => {
  try {
    const tshirts = await db.collection('tshirtss').find().toArray();
    res.status(200).set('Content-Type', 'text/html').render('admin', { tshirts: tshirts || [], user: loggedInUser });
  } catch (err) {
    console.error('Ошибка загрузки футболок:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/admin/edit/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Запрос редактирования футболки с ID:', id);
    if (!isValidObjectId(id)) {
      console.log('Неверный ObjectId:', id);
      return res.status(400).json({ error: 'Неверный ID' });
    }
    const tshirt = await db.collection('tshirtss').findOne({ _id: new ObjectId(id) });
    if (!tshirt) {
      console.log('Футболка не найдена для ID:', id);
      return res.status(404).json({ error: 'Футболка не найдена' });
    }
    console.log('Отправляем данные футболки:', tshirt);
    res.status(200).json(tshirt);
  } catch (err) {
    console.error('Ошибка получения футболки:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.post('/admin/add', isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const { name, price, color, size } = req.body;
    console.log('Добавление футболки:', { name, price, color, size });
    if (!name || !price || !color || !size) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }
    const imagePath = req.file ? `/uploads/${req.file.filename}` : '/uploads/default.jpg';
    await db.collection('tshirtss').insertOne({
      name,
      price: parseFloat(price),
      color,
      size,
      image: imagePath
    });
    res.status(200).json({ message: 'Футболка добавлена', redirect: '/admin' });
  } catch (err) {
    console.error('Ошибка добавления футболки:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.put('/admin/edit/:id', isAuthenticated, upload.single('image'), async (req, res) => {
  try {
    const { name, price, color, size } = req.body;
    const { id } = req.params;
    console.log('Редактирование футболки:', { id, name, price, color, size });
    if (!isValidObjectId(id)) {
      console.log('Неверный ObjectId:', id);
      return res.status(400).json({ error: 'Неверный ID' });
    }
    if (!name || !price || !color || !size) {
      return res.status(400).json({ error: 'Все поля обязательны' });
    }
    const updateData = { name, price: parseFloat(price), color, size };
    if (req.file) {
      updateData.image = `/uploads/${req.file.filename}`;
    }
    const result = await db.collection('tshirtss').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );
    if (result.matchedCount === 0) {
      console.log('Футболка не найдена для ID:', id);
      return res.status(404).json({ error: 'Футболка не найдена' });
    }
    console.log('Футболка обновлена для ID:', id);
    res.status(200).json({ message: 'Футболка обновлена', redirect: '/admin' });
  } catch (err) {
    console.error('Ошибка редактирования футболки:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.delete('/admin/delete/:id', isAuthenticated, async (req, res) => {
  try {
    const { id } = req.params;
    console.log('Удаление футболки:', id);
    if (!isValidObjectId(id)) {
      console.log('Неверный ObjectId:', id);
      return res.status(400).json({ error: 'Неверный ID' });
    }
    const tshirt = await db.collection('tshirtss').findOne({ _id: new ObjectId(id) });
    if (!tshirt) {
      console.log('Футболка не найдена для ID:', id);
      return res.status(404).json({ error: 'Футболка не найдена' });
    }
    if (tshirt.image && tshirt.image !== '/uploads/default.jpg') {
      const imagePath = path.join(__dirname, 'public', tshirt.image);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    const result = await db.collection('tshirtss').deleteOne({ _id: new ObjectId(id) });
    if (result.deletedCount === 0) {
      console.log('Футболка не найдена для ID:', id);
      return res.status(404).json({ error: 'Футболка не найдена' });
    }
    console.log('Футболка удалена для ID:', id);
    res.status(200).json({ message: 'Футболка удалена', redirect: '/admin' });
  } catch (err) {
    console.error('Ошибка удаления футболки:', err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

app.get('/logout', (req, res) => {
  console.log('Выход пользователя');
  loggedInUser = null;
  res.status(301).redirect('/auth');
});

app.use((req, res) => {
  res.status(404).set('Content-Type', 'text/html').render('404', { user: loggedInUser });
});

app.listen(3000, () => {
  console.log('Сервер запущен на http://localhost:3000');
});