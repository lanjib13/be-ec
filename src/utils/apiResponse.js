export function successResponse(data) {
  return { data };
}

export function paginatedResponse(data, meta) {
  return { data, meta };
}
