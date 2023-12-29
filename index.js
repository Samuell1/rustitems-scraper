require('dotenv').config()
import fs from 'fs'

import puppeteer from 'puppeteer'
import scrapeIt from 'scrape-it'

const cratesData = []

puppeteer.launch().then(async browser => {

  const page = await browser.newPage()
  await page.goto('https://rustlabs.com/group=containers')
  const html = await page.content()
  const crates = await scrapeIt.scrapeHTML(html,
      {
        data: {
          listItem: "table.w100.olive tbody tr",
          data: {
            name: 'a',
            url: {
              selector: 'a',
              attr: "href",
              convert: (value) => 'https://rustlabs.com' + value
            },
          }
        }
      }
  )

  for (const crate of crates.data) {
    const page = await browser.newPage()
    await page.goto(crate.url)
    const html = await page.content()

    const scrapeHTML = await scrapeIt.scrapeHTML(html,
      {
        crateImage: {
          selector: "img[id=\"screenshot\"]",
          attr: "src",
          convert: (value) => value.replace('//rustlabs.com/img/screenshots/', '')
        },
        loot: {
          listItem: ".tab-table[data-name=content] .table tbody tr",
          data: {
            name: 'a',
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
              convert: (value) => {
                value = value.replace(' %', '')
                return value !== '-' ? value : null
              }
            },
            category: {
              selector: 'td:nth-child(4)',
            },
            percentage: {
              selector: 'td:nth-child(5)',
              convert: (value) => Number(value.replace(' %', ''))
            },
            image: {
              selector: 'img',
              attr: "src",
              convert: (value) => value.replace('//rustlabs.com/img/items40/', '')
            },
          }
        }
      }
      )
    console.log('\x1b[46m%s\x1b[0m', crate.url + ' loot founded: ' + scrapeHTML.loot.length)

    // Save image of crate
    const crateImagePage = await browser.newPage();
    const crateImagefileDL = await crateImagePage.goto(`https://rustlabs.com/img/screenshots/${scrapeHTML.crateImage}`)
    const slugName = crate.name.toLowerCase().replace(/ /g, '-')
    const crateImagePath = `./crates/${slugName}.png`
    if (!fs.existsSync(crateImagePath)) {
      await fs.writeFile(crateImagePath, await crateImagefileDL.buffer(), function (err) {
        if (err) throw err
      })
    }

    // Save images of loot
    scrapeHTML.loot.forEach(async (item) => {
      const imagePage = await browser.newPage();
      const imagefileDL = await imagePage.goto(`https://rustlabs.com/img/items40/${item.image}`)
      const imagePath = `./items/${item.image}`
      if (!fs.existsSync(imagePath)) {
        await fs.writeFile(imagePath, await imagefileDL.buffer(), function (err) {
          if (err) throw err
        })
      }
    })

    cratesData.push({
      name: crate.name,
      url: crate.url,
      loots: scrapeHTML.loot
    })

    await page.close()
  }

  await fs.writeFile('crates.json', JSON.stringify(cratesData), function (err) {
    if (err) throw err
    console.log('Crates Saved!')
  })

  // await browser.close()
})
