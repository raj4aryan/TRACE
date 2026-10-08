// import crypto from "crypto"

// const randomHex = crypto.randomBytes(4).toString('hex').toUpperCase()
// const datePart = new Date().toISOString().split("T")[0]
// console.log(randomHex)
// console.log(`INC-${datePart}-${randomHex}`)

import bcrypt, { hash } from "bcrypt"

const aadhaar_id = "123456789754"
const saltRounds = 10
const hashed = await bcrypt.hash(aadhaar_id, saltRounds)

console.log(hashed)
// console.log(await bcrypt.compare(aadhaar_id, hashed))




/*
report crime
{
  "source": "Citizen",
  "crime_category": "Theft",
  "description": "Saw a man jumping out of the house at 1:23 AM with some bags",
  "location_type": "Residential",
  "longitude": 73.850633,
  "latitude": 18.456902,
  "address": {
    "street_name": "Katraj",
    "city": "Pune",
    "state": "Maharashtra",
    "pincode": 411046
  }
}
*/


/*
create user
{
  "user_name": "Raj",
  "password": "responsible@Citizen1"
  "phone_number": "45324429234",
  "email": "example@gmail.com",
  "aadhaar_id": "123456789027"
}

*/


/*
login
{
  "password": "responsible@Citizen1",
  "email": "example@gmail.com"
}

*/

/*
authorize role
{
  "target_email": "police1.swargatepolice@gmail.com",
  "requested_role": "authority"
}

*/


//------POLICE------

/*
Police login
{
  "password": "responsible@Police1",
  "email": "police1.swargatepolice@gmail.com"
}

*/



