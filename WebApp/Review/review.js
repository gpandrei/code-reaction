﻿
/*
** Page vue
*/
var review = new Vue({
    el: "#vue",
    data: function () {
        return {
            showEditor: false,
            Commit: {}

        };
    },

    components: {
        'comment-block': comment,
        'file-block': fileBlock,
        'new-comment-block': newComment,
        'commit-details': commitInfo,
        'commit-actions': commitActions,
        'comment-nav' : commentNav
    },

    methods: {
        refreshPage: function (event) {

            var revision = getParameterByName('revision');
            var uri = '/api/review/revision/' + revision;

            $.getJSON(uri)
                .done(function (data) {
                    review.$data.Commit = data;
                });
        },


        timeAgo: function (aMoment) {
            if (aMoment)
                return moment(aMoment).fromNow();
        },

        openCommentDialog: function () {
            this.showEditor = true;
        },

        closeCommentDialog: function () {
            this.showEditor = false;
        },

        postedNewComment: function (message) {
            var comment = { Id: 1, Author: getUsername(), Text: message, Replies: [], Timestamp: moment().utc()};
            this.closeCommentDialog();

            var commit = this.$data.Commit;
            commit.CommitComments.push(comment);
            uri = '/api/review/comment/' + comment.Author + '/' + commit.Revision + "?comment=" + encodeURIComponent(comment.Text);
            $.post(uri)
                .done(function (data) {
                    var temp = commit.CommitComments[commit.CommitComments.length - 1];
                    temp.Id = data;
                    commit.CommitComments[commit.CommitComments.length - 1] = temp;
                });
        },

        cancelledNewComment: function () {
            this.closeCommentDialog();
        },

        approveCommit: function (event) {
            var commit = event;

            var approver = getUsername();

            var uri = '/api/review/approve/' + commit.Revision + '/' + approver;
            $.post(uri)
                .done(function () {
                    commit.ApprovedBy = approver;
                });
        },


        postCodeComment: function (event) {
            var line = event.Line;
            line.Comments.push(
                { Id: 1, File: line.File, LineId: line.Id, Replies: [], Text: event.Text, Revision: line.Revision, Author: getUsername(), Timestamp: moment().utc() }
            );

            var uri = '/api/review/comment/' + getUsername() + '/' + line.Revision + '/' + line.Id + "?comment=" + encodeURIComponent(event.Text) + "&file=" + encodeURIComponent(line.File);

            var temp = { Id: 1, Author: getUsername(), Text: event.Text, Replies: [], Timestamp: moment().utc() };

            this.showEditor = false;

            $.post(uri)
                .done(function (data) {
                    var temp = line.Comments[line.Comments.length - 1];
                    temp.Id = data;
                    line.Comments[line.Comments.length - 1] = temp;
                });
        },

        postReply: function (event) {

            var comment = event.Comment;
            comment.Replies.push(
                { Id: 1, Text: event.Message, Replies: [], ReplyToId: comment.Id, Timestamp: moment().utc(), Author : getUsername() }
            );

            var uri = '/api/review/reply/' + event.Comment.Id + '/' + getUsername() + '?comment=' + encodeURIComponent(event.Message);

            $.post(uri, function (data) {
                var temp = comment.Replies[comment.Replies.length - 1];
                temp.Id = data;
                comment.Replies[comment.Replies.length - 1] = temp;
            });
        },

        postOK:function(event) {
            var comment = event.Comment;
            var text = "OK, thanks!";
            comment.Replies.push(
                { Id: 1, Text: text, Replies: [], ReplyToId: comment.Id, Timestamp: moment().utc(), Author: getUsername() }
            );

            var uri = '/api/review/reply/' + event.Comment.Id + '/' + getUsername() + '?comment=' + encodeURIComponent(text);

            $.post(uri, function (data) {
                var temp = comment.Replies[comment.Replies.length - 1];
                temp.Id = data;
                comment.Replies[comment.Replies.length - 1] = temp;
            });
        },

        likeLine: function (event) {
            var line = event.Line;
            line.Likes.push( getUsername() );
               
            var uri = '/api/review/like/' + getUsername() + '/' + line.Revision + '/' + line.Id + "?&file=" + encodeURIComponent(line.File);

            $.post(uri)
                .done(function (data) {
                });
        },
        unLikeLine: function (event) {
            var line = event.Line;
            var index = -1;
            for (var i = 0; i < line.Likes.length && index === -1; i++) {
                if (line.Likes[i] === getUsername()) {
                    index = i;
                }
            }

            if (index !== -1) {
                line.Likes.splice(index, 1);
                var uri = '/api/review/unlike/' + getUsername() + '/' + line.Revision + '/' + line.Id + "?&file=" + encodeURIComponent(line.File);
                $.post(uri) 
                .done(function (data) {
                });
            }

        }
    },

    mounted: function () {
        this.refreshPage();
    },

    created: function () {
        BUS.$on("new-code-comment", this.postCodeComment);
        BUS.$on("posted-reply", this.postReply);
        BUS.$on("approve-commit", this.approveCommit);
        BUS.$on("posted-ok", this.postOK);
        BUS.$on("like-line", this.likeLine);
        BUS.$on("unlike-line", this.unLikeLine);
    }

});