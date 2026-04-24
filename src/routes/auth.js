const express = require('express');
const { authenticate } = require('../middleware/auth');
const { validateLogin, validateUserCreation, handleValidationErrors } = require('../utils/validators');
const authController = require('../controllers/authController');

const router = express.Router();

router.post('/login', validateLogin, handleValidationErrors, authController.login);
router.post('/register', validateUserCreation, handleValidationErrors, authController.register);
router.get('/validate', authenticate, authController.validateToken);

module.exports = router;
