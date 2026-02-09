const User = require('../models/User');

exports.register = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Dati mancanti' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email già registrata' });
    }

    const user = new User({
      name,
      email,
      password, // per ora in chiaro (cripteremo dopo)
      role,
    });

    await user.save();

    res.status(201).json({
      message: 'Utente registrato con successo',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Errore server', error });
  }
};
