function notFound(req, res) {
  res.status(404).json({
    message: 'Recurso no encontrado.'
  });
}

function errorHandler(error, req, res, next) {
  const statusCode = error.statusCode || 500;
  const message = statusCode === 500
    ? 'Error interno del servidor.'
    : error.message;

  if (statusCode === 500) {
    console.error(error);
  }

  const response = { message };

  if (error.details) {
    response.details = error.details;
  }

  res.status(statusCode).json(response);
}

module.exports = {
  notFound,
  errorHandler
};
