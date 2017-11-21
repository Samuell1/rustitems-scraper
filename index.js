require('dotenv').config()

import scrapeIt from 'scrape-it'
import fs from 'fs'

import crates from './crates.js'
import api from './api.js';

const createLoot = `($dataId: String!, $name: String, $percentage: Float, $blueprint: Boolean, $crateId: ID, $amount: String) {
  newData: createLoot(dataId: $dataId, name: $name, percentage: $percentage, blueprint: $blueprint, crateId: $crateId, amount: $amount) {
    id
    blueprint
    crate {
      id
    }
    dataId
    name
    percentage
  }
}
`;

const createChangelog = `($description: String, $date: DateTime!) {
  newData: createChangelog(description: $description, date: $date) {
    id
    date
  }
}
`;

// Add new changelog
api.mutate(createChangelog, {
  date: new Date(),
  description: 'Updated loottables'
})
console.log('\x1b[33m%s\x1b[0m', '### Added new changelog: ' + new Date())

// Recreate all loottables
crates.forEach(async (crate) => {

  const page = await scrapeIt(crate.url,
  {
    loot: {
      listItem: ".table.sorting tbody tr",
      data: {
        name: 'a',
        dataId: {
          selector: 'img',
          attr: 'src',
          convert: (value) => value && value.replace(/\/\/rustlabs.com\/img\/items40\/|.png|.jpg/gi, '')
        },
        blueprint: {
          selector: 'a',
          convert: (value) => value.includes('Blueprint')
        },
        amount: {
          selector: '.text-in-icon'
          // convert: (value) => value.replace(/ml|×/gi, '') - remove ml and ×
        },
        percentage: {
          selector: 'td:nth-child(5)',
          convert: (value) => Number(value.replace(' %', ''))
        }
      }
    }
  }
  )
  console.log('\x1b[46m%s\x1b[0m', crate.url + ' loot founded: ' + page.loot.length)

  page.loot.forEach(async (vars, index) => {
    setTimeout(() => {
      vars.crateId = crate.id
      await api.mutate(createLoot, vars)

      console.log('\x1b[32m%s\x1b[0m', crate.url + ' -> '+ vars.name + ' - ADDED')
    }, 100*(index+1)) // limit requests per sec
  })

})