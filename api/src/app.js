const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const linkRoutes = require('./routes/links');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const apiKeyRoutes = require('./routes/apiKeys');
const redirectRoutes = require('./routes/redirect');
const auth = require('./middleware/auth');
const { createLink } = require('./controllers/linkController');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/links', linkRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/roles', roleRoutes);
app.use('/api/v1/api-keys', apiKeyRoutes);
app.post('/api/v1/shorten', auth, createLink);
app.use('/', redirectRoutes);

module.exports = app;
