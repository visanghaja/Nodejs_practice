const router = require('express').Router()

function checkLogin(요청, 응답, next){ // 요청, 응답 사용가능
    if (!요청.user) {
        응답.send('로그인하세요') // 응답 하면 다음 코드 실행 안됨
    }
    next() // 미들웨어 함수 끝내고 다음으로 넘어가 주세요
}

router.get('/sports', checkLogin, (요청, 응답) => {
    응답.send('스포츠 게시판')
 })
 router.get('/game', checkLogin, (요청, 응답) => {
    응답.send('게임 게시판')
 }) 

module.exports = router