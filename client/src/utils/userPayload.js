export const extractUserFromResponse = (data) =>
  data?.result?.user || data?.user || data?.result

export const buildManagedUserPayload = (userData) => {
  const payload = { ...userData }

  if (userData.role === 'client' && userData.clientInfo) {
    payload.clientInfo = userData.clientInfo
  } else if (
    (userData.role === 'staff' || userData.role === 'admin') &&
    userData.staffInfo
  ) {
    payload.staffInfo = userData.staffInfo
  }

  return payload
}
