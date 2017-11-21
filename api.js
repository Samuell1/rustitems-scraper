const Lokka = require('lokka').Lokka
const Transport = require('lokka-transport-http').Transport

const headers = {
  Authorization: process.env.API_KEY
}

export default new Lokka({
  transport: new Transport('https://api.graph.cool/simple/v1/cj8g20g6q030q0156airzo84g', { headers })
})