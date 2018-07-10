var express = require('express');
var app = express();
var mongoose    = require('mongoose');
var session = require('express-session');
var fs = require('fs');
var multer = require('multer');
var upload = multer({dest:'./upload/'});
var path = require('path');

var _storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './upload');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});
 
var upload = multer({storage : _storage});


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

        var page = req.param('page');
        if(page == null) {page = 1;}

        var pages = Math.max(1,req.query.page)
        var skipSize = (pages-1)*10;
        var limitSize = 10;
        var pageNum = 1;

        BbsContents.count({deleted:false},function(err, totalCount){
            // db에서 날짜 순으로 데이터들을 가져옴
             if(err) throw err;
     
             pageNum = Math.ceil(totalCount/limitSize);
             BbsContents.find({deleted:false}).sort({date:-1}).skip(skipSize).limit(limitSize).exec(function(err, pageContents) {
                 if(err) throw err;
                 res.render('bbs', {contents: pageContents, pagination: pageNum, searchWord: '', pages : pages, paramId: sess.paramId});
             });
         });
    });

    router.get('/process/download/:path', function(req, res){
        // file download
        var path = req.params.path;
        res.download('./upload/'+path, path);
        console.log(path);
    });

    router.post('/reply', function(req, res){
        // 댓글 다는 부분
        var reply_writer = req.body.replyWriter;
        var reply_comment = req.body.replyComment;
        var reply_id = req.body.replyId;
        var sess = req.session;
        var id = sess.bbs1._id;

        var BbsContents = require('./bbscontents');

        BbsContents.findOne({_id: id}, function(err, rawContent){
            if(err) throw err;
            rawContent.comments.unshift({name:reply_writer, memo: reply_comment});
            rawContent.save(function(err){
                if(err) throw err;
            });
        });
    
        res.redirect('/bbsview?id='+reply_id);
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
        var id = sess.bbs1._id;

        BbsContetns.findOne({_id:id},function(err, data){
            if(err){
                console.log(err);
                res.write(err);
            }
            if(data.password != modbbsPw){
                console.log(data);
                console.log("비번불일치함");
                res.redirect('/delete');
            }else{
                console.log("비번일치함");
                BbsContetns.update({_id:id}, {$set: {deleted:true}}, function(err){
                    if(err){
                        console.log(err);
                        res.write(err);
                    }
                    console.log("삭제에 성공하였습니다.");
                    res.redirect('/bbs');
                });
            }
        });
    });

    router.post('/process/modify', function(req, res){
        var sess = req.session;
        
        var modbbsTitle = req.body.modbbsTitle;
        var modbbsWriter = req.body.modbbsWriter;
        var modbbsContent = req.body.modbbsContent;
        var modbbsPw = req.body.modbbsPw;

        var BbsContetns = require('./bbscontents');


        var id = sess.bbs1._id;

        BbsContetns.findOne({_id:id},function(err, data){
            if(err){
                console.log(err);
                res.write(err);
            }
            if(data.password != modbbsPw){
                console.log(data);
                console.log("비번불일치함");
                res.redirect('/modify');
            }else{
                console.log("비번일치함");
                BbsContetns.update({_id:id}, {$set: {title: modbbsTitle, contents: modbbsContent, date: Date.now()}}, function(err){
                    if(err){
                        console.log(err);
                        res.write(err);
                    }
                    console.log("수정에 성공하였습니다.");
                    res.redirect('/bbs');
                });
            }
        });
    });

    router.post('/process/write', upload.array('UploadFile'),function(req, res){

        var mode = req.param('mode');
        // 글 작성하고 submit하게 되면 저장이 되는 부분
        var addNewTitle = req.body.bbsTitle;
        var addNewWriter = req.body.bbsWriter;
        var addNewContent = req.body.bbsContent;
        var addNewPassword = req.body.bbsPw;
        var upFile = req.files; 

        if(mode == 'add') {
            if (isSaved(upFile)) { // 파일이 제대로 업로드 되었는지 확인 후 디비에 저장시키게 됨
                addBoard(addNewTitle, addNewWriter, addNewContent, addNewPassword, upFile);
                res.redirect('/bbs');
            } else {
            console.log("파일이 저장되지 않았습니다!");
            }
        }
    });

    router.get('/view', function(req, res){
        
         var contentId = req.param('id');

         var BbsContetns = require('./bbscontents');

         BbsContetns.findOne({_id:contentId}, function(err, rawContent){
             if(err) throw err;
             rawContent.count += 1; // 조회수를 늘려줍니다.
             var reply_pg = Math.ceil(rawContent.comments.length/5);
             rawContent.save(function(err){ // 변화된 조횟수 저장
                if(err) throw err;
                
                var sess;
                sess = req.session;
                sess.bbs1 = rawContent;

                res.redirect('/bbsview?id='+contentId);
                
             });
         });
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
                console.log(err);
                res.write(err);
            }
            if(data.length != 0){
                console.log("로그인에 성공하였습니다.");
                sess.paramId = paramId;
                res.redirect('/bbs');
            }else{
                console.log("로그인에 실패하였습니다.");
                res.redirect('/');
                
            }
        });
    });

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
                console.log(err);
                res.write(err);
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
                        console.log(err);
                        res.write(err);
                    }
                    console.log("회원가입에 성공하였습니다.");
                    res.redirect('/login');

                });
            }
        });
    });

    router.get('/process/logout', function(req, res){
        sess = req.session;
        if(sess.paramId){
            req.session.destroy(function(err){
                if(err){
                    console.log(err);
                }else{
                    res.send('<script type="text/javascript">alert("로그인 실패. ID와 비밀번호를 확인하세요.");</script>');
                    res.redirect('/login');                    
                }
            });
        }else{
            res.redirect('/login');
        }
    });

    

    router.post('/upload', upload.single('upload'), function(req,res) {
        var tmpPath = req.file.path;
        var fileName = req.file.filename;
        var newPath = "./public/images/" + fileName;
        fs.rename(tmpPath, newPath, function (err) {
            if (err) {
            console.log(err);
            }
            var html;
            html = "";
            html += "<script type='text/javascript'>";
            html += " var funcNum = " + req.query.CKEditorFuncNum + ";";
            html += " var url = \"/images/" + fileName + "\";";
            html += " var message = \"업로드 완료\";";
            html += " window.parent.CKEDITOR.tools.callFunction(funcNum, url);";
            html += "</script>";
            res.send(html);
        });
    });
};

function addBoard(title, writer, content, password, upFile){
    var newContent = content.replace(/\r\n/gi, "\\r\\n");
    var BbsContents = require('./bbscontents');
    var newbbs = new BbsContents();
    newbbs.writer = writer;
    newbbs.title = title;
    newbbs.contents = content;
    newbbs.password = password;

    newbbs.save(function (err) {
        if (err) throw err;
        BbsContents.findOne({_id: newbbs._id}, {_id: 1}, function (err, newBoardId) {
            if (err) throw err;

            if (upFile != null) {
                var renaming = renameUploadFile(newBoardId.id, upFile);    

                for (var i = 0; i < upFile.length; i++) {
                    fs.rename(renaming.tmpname[i], renaming.fsname[i], function (err) {
                        if (err) {
                            console.log(err);
                            return;
                        }
                    });
                }

                for (var i = 0; i < upFile.length; i++) {
                    BbsContents.update({_id: newBoardId.id}, {$push: {fileUp: renaming.fullname[i]}}, function (err) {
                        if (err) throw err;
                    });
                }
                
            }
        });
    });
}

function isSaved(upFile) {
    // 파일 저장 여부 확인해서 제대로 저장되면 디비에 저장되는 방식

    var savedFile = upFile;
    var count = 0;

    if(savedFile != null) { // 파일 존재시 -> tmp폴더에 파일 저장여부 확인 -> 있으면 저장, 없으면 에러메시지
        for (var i = 0; i < savedFile.length; i++) {
            if(fs.statSync(getDirname(1) + savedFile[i].path).isFile()){ //fs 모듈을 사용해서 파일의 존재 여부를 확인한다.
                count ++; // true인 결과 갯수 세서
            }

        }
        if(count == savedFile.length){  //올린 파일 갯수랑 같으면 패스
            return true;
        }else{
            return false;
        }
    }else{ // 파일이 처음부터 없는 경우
        return true;
    }
}

function getDirname(num){
    //원하는 상위폴더까지 리턴해줌. 0은 현재 위치까지, 1은 그 상위.. 이런 식으로
    // 리네임과, 파일의 경로를 따오기 위해 필요함.
    var order = num;
    var dirname = __dirname.split('/');
    var result = '';
    for(var i=0;i<dirname.length-order;i++){
        result += dirname[i] + '/';
    }
    return result;
}

function renameUploadFile(itemId,upFile){
    // 업로드 할때 리네이밍 하는 곳!
    var renameForUpload = {};
    var newFile = upFile; // 새로 들어 온 파일
    var tmpPath = [];
    var tmpType = [];
    var index = [];
    var rename = [];
    var fileName = [];
    var fullName = []; // 다운로드 시 보여줄 이름 필요하니까 원래 이름까지 같이 저장하자!
    var fsName = [];
    for (var i = 0; i < newFile.length; i++) {
        tmpPath[i] = newFile[i].path;
        tmpType[i] = newFile[i].mimetype.split('/')[1]; // 확장자 저장해주려고!
        index[i] = tmpPath[i].split('/').length;
        rename[i] = tmpPath[i].split('/')[index[i] - 1];
        //fileName [i] = itemId + "_" + getFileDate(new Date()) + "_" + rename[i] ; // 파일 확장자 명까지 같이 가는 이름 "글아이디_날짜_파일명.확장자"
        fileName [i] = newFile[i].originalname ; // 파일 확장자 명까지 같이 가는 이름 "글아이디_날짜_파일명.확장자"
        fullName [i] = fileName[i] + ":" + newFile[i].originalname.split('.')[0]; // 원래 이름까지 같이 가는 이름 "글아이디_날짜_파일명.확장자:보여줄 이름"
        fsName [i] = getDirname(1)+"upload/"+fileName[i]; // fs.rename 용 이름 "./upload/글아이디_날짜_파일명.확장자"
    }
    renameForUpload.tmpname = tmpPath;
    renameForUpload.filename = fileName;
    renameForUpload.fullname = fullName;
    renameForUpload.fsname = fsName;
    return renameForUpload;
}

function getFileDate(date) {
    var year = date.getFullYear();
    var month = date.getMonth()+1;
    var day = date.getDate();
    var hour = date.getHours();
    var min = date.getMinutes();
    var sec = date.getSeconds();
    var fullDate = year+""+month+""+day+""+hour+""+min+""+sec;
    return fullDate;
}