require('dotenv').config()

import puppeteer from 'puppeteer'
import scrapeIt from 'scrape-it'

import crates from './crates.js'
import api from './api.js';

const mutate = true

const createLoot = `($dataId: String!, $name: String, $percentage: Float, $blueprint: Boolean, $crateId: ID, $amount: String, $category: String!) {
  newData: createLoot(dataId: $dataId, name: $name, percentage: $percentage, blueprint: $blueprint, crateId: $crateId, amount: $amount, category: { name: $category }) {
    id
    blueprint
    crate {
      id
    }
    dataId
    name
    percentage
    category {
      id
      name
    }
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
if (mutate) {
  api.mutate(createChangelog, {
    date: new Date(),
    description: 'Updated loottables'
  })
}
console.log('\x1b[33m%s\x1b[0m', '### Added new changelog: ' + new Date())

// Recreate all loottables
puppeteer.launch().then(async browser => {

  await crates.forEach(async (crate) => {
    const page = await browser.newPage()
    await page.goto(crate.url)
    const html = await page.content()

    const scrapeHTML = await scrapeIt.scrapeHTML(html,
      {
        loot: {
          listItem: ".tab-table[data-name=content] .table.sorting tbody tr",
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
            condition: {
              selector: 'td:nth-child(3)',
              convert: (value) => value.replace('NaN', '')
            },
            category: {
              selector: 'td:nth-child(4)',
            },
            percentage: {
              selector: 'td:nth-child(5)',
              convert: (value) => Number(value.replace(' %', ''))
            }
          }
        }
      }
      )
    console.log('\x1b[46m%s\x1b[0m', crate.url + ' loot founded: ' + scrapeHTML.loot.length)
  
    scrapeHTML.loot.forEach(async (vars, index) => {
      setTimeout(async () => {
        vars.crateId = crate.id
        if (mutate) await api.mutate(createLoot, vars)
  
        console.log('\x1b[32m%s\x1b[0m', crate.url + ' -> '+ vars.name + ' - ADDED')
      }, 100*(index+1)) // limit requests per sec
    })

    await page.close()
  })
  // await browser.close()
})