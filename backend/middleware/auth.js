const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET nao configurado. Defina uma chave segura no .env.');
}

/**
 * Middleware de autenticação JWT
 */
const autenticar = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ erro: 'Token de autenticação não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.usuario = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ erro: 'Token expirado. Faça login novamente.' });
    }
    return res.status(401).json({ erro: 'Token inválido' });
  }
};

/**
 * Middleware para verificar perfil específico
 */
const exigirPerfil = (...perfis) => {
  return (req, res, next) => {
    if (!perfis.includes(req.usuario.perfil)) {
      return res.status(403).json({ erro: 'Acesso negado para este perfil' });
    }
    next();
  };
};

/**
 * Gerar token JWT
 */
const gerarToken = (usuario) => {
  return jwt.sign(
    {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
      perfil: usuario.perfil
    },
    JWT_SECRET,
    { expiresIn: '8h' }
  );
};

module.exports = { autenticar, exigirPerfil, gerarToken };
