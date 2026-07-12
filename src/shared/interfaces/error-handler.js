class ErrorHandler {
  notFound(req, res) {
    res.status(404).json({ message: 'Recurso no encontrado.' });
  }

  handle(error, req, res, next) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) console.error(error);
    const response = {
      message: statusCode >= 500 ? 'Error interno del servidor.' : error.message
    };
    if (error.details) response.details = error.details;
    res.status(statusCode).json(response);
  }
}

module.exports = ErrorHandler;
