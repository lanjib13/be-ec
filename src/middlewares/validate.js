export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const error = new Error('Input tidak valid.');
      error.status = 422;
      error.code = 'VALIDATION_ERROR';
      error.details = result.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      }));
      next(error);
      return;
    }

    req[source] = result.data;
    next();
  };
}
