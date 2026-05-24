import { faker } from '@faker-js/faker'
import { randomUUID } from 'crypto'
import type { GenerationStrategy } from './types'
import type { Field } from '@shared/ipc.types'

export class DefaultStrategy implements GenerationStrategy {
  generate(field: Field): unknown {
    if (field.rule) {
      throw new Error('DefaultStrategy cannot be used with a rule on field "' + field.name + '"')
    }

    switch (field.type) {
      case 'string':
        return this.generateString(field)
      case 'number':
        return faker.number.int({ min: 0, max: 10000 })
      case 'boolean':
        return faker.datatype.boolean()
      case 'object':
        return {}
      case 'array':
        return []
      case 'null':
        return null
    }
  }

  private generateString(field: Field): string {
    const name = field.name.toLowerCase()

    if (name.includes('email')) {
      return faker.internet.email()
    }
    if (name.includes('lastname') || name === 'last_name') {
      return faker.person.lastName()
    }
    if (name.includes('name') || name.includes('firstname') || name === 'first_name') {
      return faker.person.firstName()
    }
    if (name.includes('phone')) {
      return faker.phone.number()
    }
    if (name.includes('city')) {
      return faker.location.city()
    }
    if (name.includes('street') || name.includes('address')) {
      return faker.location.streetAddress()
    }
    if (name.includes('zip') || name.includes('postal') || name.includes('zipcode') || name === 'zip_code') {
      return faker.location.zipCode()
    }
    if (name.includes('url')) {
      return faker.internet.url()
    }
    if (name.includes('description') || name.includes('bio')) {
      return faker.lorem.sentence()
    }
    if (name === 'id' || name.endsWith('_id') || name.endsWith('id')) {
      return randomUUID()
    }
    if (name.includes('color') || name.includes('colour')) {
      return faker.color.human()
    }

    return faker.lorem.word()
  }
}
