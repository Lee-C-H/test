var express = require('express');
var app = express();
var mongoose    = require('mongoose');
var session = require('express-session');


module.exports = function(router)
{
    
    router.use(express.static('/public'));
    router.get('/', function(req, res) {
        var sess = req.session;
        res.render('main', {paramId: sess.paramId });
    });

    router.get('/main', function(req, res) {
        var sess = req.session;
        res.render('main', {paramId: sess.paramId });
    });

    router.get('/login', function(req, res) {
        var sess = req.session;
        res.render('login', {paramId: sess.paramId });
    });

    router.get('/join', function(req, res) {
        var sess = req.session;
       
        res.render('join', {paramId: sess.paramId });
    });

    router.get('/bbs', function(req, res) {
        
        var sess = req.session;
        var BbsContents = require('./bbscontents');
        /*
        BbsContents.find({}).sort({date:-1}).exec(function(err, rawContents){
            if(err) throw err;
            res.render('bbs', {contents: rawContents, paramId: sess.paramId});
        });
        */
        var page = req.param('page');
        if(page == null) {page = 1;}

        var skipSize = (page-1)*10;
        var limitSize = 10;
        var pageNum = 1;

        BbsContents.count({deleted:false},function(err, totalCount){
            // db에서 날짜 순으로 데이터들을 가져옴
             if(err) throw err;
     
             pageNum = Math.ceil(totalCount/limitSize);
             BbsContents.find({deleted:false}).sort({date:-1}).skip(skipSize).limit(limitSize).exec(function(err, pageContents) {
                 if(err) throw err;
                 res.render('bbs', {contents: pageContents, pagination: pageNum, searchWord: '', paramId: sess.paramId});
             });
         });

       
       
    });

    router.get('/write', function(req, res) {
        var sess = req.session;
        var BbsContents = require('./bbscontents');
        BbsContents.find({}).sort({date:-1}).exec(function(err, rawContents){
            if(err) throw err;
            res.render('write', {contents: rawContents,paramId: sess.paramId});
        });
    });

    router.get('/bbsview', function(req, res) {
        var sess = req.session;     
        res.render('bbsview', {content: sess.bbs1, paramId: sess.paramId});
    });

    router.get('/modify', function(req, res) {
        var sess = req.session;     
        res.render('modify', {content: sess.bbs1, paramId: sess.paramId});
    });

    router.get('/delete', function(req, res) {
        var sess = req.session;     
        res.render('delete', {content: sess.bbs1, paramId: sess.paramId});
    });
    
    router.post('/process/delete', function(req, res) {



        var sess = req.session;
        
        var modbbsPw = req.body.modbbsPw;

        var BbsContetns = require('./bbscontents');

        var id = sess.bbs1._id

        BbsContetns.findOne({_id:id},function(err, data){
            if(err){
                console.log(err)
                res.write(err)
            }
            if(data.password != modbbsPw){
                console.log(data);
                console.log("비번불일치함");
                res.redirect('/delete');
            }else{
                console.log("비번일치함");
                BbsContetns.update({_id:id}, {$set: {deleted:true}}, function(err){
                    if(err){
                        console.log(err)
                        res.write(err)
                    }
                    console.log("삭제에 성공하였습니다.");
                    res.redirect('/bbs');
                })
            }
        })
    });

    router.post('/process/modify', function(req, res){
        var sess = req.session;
        
        var modbbsTitle = req.body.modbbsTitle;
        var modbbsWriter = req.body.modbbsWriter;
        var modbbsContent = req.body.modbbsContent;
        var modbbsPw = req.body.modbbsPw;

        var BbsContetns = require('./bbscontents');


        var id = sess.bbs1._id

        BbsContetns.findOne({_id:id},function(err, data){
            if(err){
                console.log(err)
                res.write(err)
            }
            if(data.password != modbbsPw){
                console.log(data);
                console.log("비번불일치함");
                res.redirect('/modify');
            }else{
                console.log("비번일치함");
                BbsContetns.update({_id:id}, {$set: {title: modbbsTitle, contents: modbbsContent, date: Date.now()}}, function(err){
                    if(err){
                        console.log(err)
                        res.write(err)
                    }
                    console.log("수정에 성공하였습니다.");
                    res.redirect('/bbs');
                })
            }
        })
    });

    router.post('/process/write', function(req, res){
        // 글 작성하고 submit하게 되면 저장이 되는 부분
        var addNewTitle = req.body.bbsTitle;
        var addNewWriter = req.body.bbsWriter;
        var addNewContent = req.body.bbsContent;
        var addNewPasword = req.body.bbsPw;

        var BbsContetns = require('./bbscontents');

        var bbs = new BbsContetns();
        bbs.writer = addNewWriter;
        bbs.title = addNewTitle;
        bbs.contents = addNewContent;
        bbs.password = addNewPasword;

        bbs.save(function(err){
            if(err){
                console.log(err)
                res.write(err)
            }
            console.log("저장에 성공하였습니다.");
            res.redirect('/bbs');
            //res.render('write', {paramId: sess.paramId });
        })
        
    });

    router.get('/view', function(req, res){
        
         var contentId = req.param('id');

         var BbsContetns = require('./bbscontents');

         BbsContetns.findOne({_id:contentId}, function(err, rawContent){
             if(err) throw err;
             rawContent.count += 1; // 조회수를 늘려줍니다.
             rawContent.save(function(err){ // 변화된 조횟수 저장
                if(err) throw err;
                
                var sess;
                sess = req.session;
                sess.bbs1 = rawContent;

                res.redirect('/bbsview');
                
             });
         })
     });

    router.post('/process/login', function(req, res){
        console.log('/process/login 호출됨.');

        var sess;
        sess = req.session;

        var paramId = req.body.id || req.query.id;
        var paramPw = req.body.pw || req.query.pw;
        var User = require('./users');
        
        //var users = db.collection('users');

        User.find({userId:paramId, userPw: paramPw},function(err, data){
            if(err){
                console.log(err)
                res.write(err)
            }
            if(data.length != 0){
                console.log("로그인에 성공하였습니다.");
                sess.paramId = paramId;
                res.redirect('/bbs');
            }else{
                console.log("로그인에 실패하였습니다.");
                res.redirect('/');
                

            }
        })        
    })

    router.post('/process/join', function(req, res) {
        console.log('/process/join 호출됨.');
        router.use(express.static('public'));
        var paramId = req.body.id || req.query.id;
        var paramPw = req.body.pw || req.query.pw;
        var paramName = req.body.name || req.query.name;
        var paramEmail = req.body.email || req.query.email;
        var User = require('./users');

        User.find({userId:paramId},function(err, data){
            if(err){
                console.log(err)
                res.write(err)
            }
            if(data.length != 0){
                console.log("중복되는 아이디가 있음");
                res.redirect('/join');

                
            }else{
                var user = new User();
                user.userId = paramId;
                user.userPw = paramPw;
                user.userName = paramName;
                user.userEmail = paramEmail;

                user.save(function(err){
                    if(err){
                        console.log(err)
                        res.write(err)
                    }
                    console.log("회원가입에 성공하였습니다.");
                    res.redirect('/login');

                })
            }
        })    
    });

    router.get('/process/logout', function(req, res){
        sess = req.session;
        if(sess.paramId){
            req.session.destroy(function(err){
                if(err){
                    console.log(err);
                }else{
                    res.redirect('/login');
                }
            })
        }else{
            res.redirect('/login');
        }
    })
}
