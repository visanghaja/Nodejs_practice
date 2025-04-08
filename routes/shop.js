const router = require('express').Router()

let connectDB = require('./../database.js')

let db;
connectDB.then((client) => { // 이렇게 하면 mongodb에 접속
    console.log('DB연결성공') // 접속이 성공하면 forum 이라는 db에 연결해라
    db = client.db('forum');
    // 서버 띄우는 코드도 여기 안에다 넣기
}).catch((err) => {
    console.log(err) // 에러나면 에러 출력
})


router.get('/shirts', async (요청, 응답) => { // router.get 이런식으로 바꾸기
    await db.collection('post').find().toArray()
    응답.send('셔츠파는 페이지')
})

router.get('/pants', (요청, 응답) => {
    응답.send('바지파는 페이지')
})

module.exports = router