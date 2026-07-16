// =====================================================================
// E-PASS — Central API client (fetch wrapper)
// Mirrors backend/docs/API_DOCUMENTATION.md exactly.
// =====================================================================

class ApiException extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
  }
}

const Api = {
  _headers(json = true) {
    const token = Storage.getToken();
    const headers = {};
    if (json) headers['Content-Type'] = 'application/json';
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  },

  _url(path, query) {
    const url = new URL(APP_CONFIG.baseUrl + path);
    if (query) {
      Object.entries(query).forEach(([k, v]) => {
        if (v !== undefined && v !== null) url.searchParams.set(k, v);
      });
    }
    return url.toString();
  },

  async _decode(res) {
    let data;
    try {
      data = await res.json();
    } catch (_) {
      data = { success: false, message: 'Unexpected server response' };
    }
    if (res.ok) return data;
    throw new ApiException(data.message || `Request failed (${res.status})`, res.status);
  },

  async get(path, query) {
    const res = await fetch(this._url(path, query), { headers: this._headers() });
    return this._decode(res);
  },

  async post(path, body) {
    const res = await fetch(this._url(path), {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(body || {}),
    });
    return this._decode(res);
  },

  async put(path, body) {
    const res = await fetch(this._url(path), {
      method: 'PUT',
      headers: this._headers(),
      body: JSON.stringify(body || {}),
    });
    return this._decode(res);
  },

  async delete(path) {
    const res = await fetch(this._url(path), {
      method: 'DELETE',
      headers: this._headers(),
    });
    return this._decode(res);
  },

  /** Multipart upload — used by Apply Leave (attachment is optional). */
  async postMultipart(path, fields, file, fileField = 'attachment') {
    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    if (file) form.append(fileField, file, file.name);

    const res = await fetch(this._url(path), {
      method: 'POST',
      headers: this._headers(false), // let the browser set the multipart boundary
      body: form,
    });
    return this._decode(res);
  },
  
  async putMultipart(path, fields, file, fileField = 'attachment') {
    const form = new FormData();
    Object.entries(fields).forEach(([k, v]) => form.append(k, v));
    if (file) form.append(fileField, file, file.name);

    const res = await fetch(this._url(path), {
      method: 'PUT',
      headers: this._headers(false),
      body: form,
    });
    return this._decode(res);
  },

  async reverseGeocode(lat, lng) {
    try {
      const url = new URL('https://nominatim.openstreetmap.org/reverse');
      url.searchParams.set('format', 'jsonv2');
      url.searchParams.set('lat', lat);
      url.searchParams.set('lon', lng);
      url.searchParams.set('accept-language', 'en');

      const res = await fetch(url.toString());
      if (!res.ok) return null;
      const data = await res.json();
      if (!data || !data.address) return data.display_name || null;

      const { address } = data;
      const parts = [];
      if (address.road) parts.push(address.road);
      if (address.suburb) parts.push(address.suburb);
      if (address.village) parts.push(address.village);
      if (address.town) parts.push(address.town);
      if (address.city) parts.push(address.city);
      if (address.county && !parts.includes(address.county)) parts.push(address.county);
      if (address.state && !parts.includes(address.state)) parts.push(address.state);
      if (parts.length) return parts.join(', ');

      return data.display_name || null;
    } catch (error) {
      return null;
    }
  },
};
