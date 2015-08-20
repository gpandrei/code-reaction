﻿
//
// Load the review page for the revision specified in the parameter
//
function loadReview() {

    var revision = getParameterByName('revision');
    var uri = 'api/commits/revision/' + revision;

    $.getJSON(uri)
        .done(function (revisionDetailViewModel) {

            var insertPoint = $('#insertPoint');
            insertPoint.empty();

            $('<div></div>')
                .text(revisionDetailViewModel.Message)
                .attr('class', 'commit-title2')
                .appendTo(insertPoint);

            $('<div></div>')
                .text("Revision : " + revisionDetailViewModel.Revision + " by " + revisionDetailViewModel.Author + " on " + revisionDetailViewModel.Timestamp)
                .attr('class', 'commit-subtitle')
                .appendTo(insertPoint);

            showReviews(revisionDetailViewModel.Reviews);

            if (revisionDetailViewModel.ApprovedBy) {
                $('<div></div>')
                    .text('This commit has been approved by: ' + revisionDetailViewModel.ApprovedBy)
                    .appendTo(insertPoint);
            }

            if (revisionDetailViewModel.Author != getUsername1()) {
                $('<button></button>')
                    .text('Add comment')
                    .on('click', { revision: revision }, markAsReviewed )
                    .appendTo(insertPoint);

                if (!revisionDetailViewModel.ApprovedBy) {
                    $('<button></button>')
                        .text('Approve')
                        .on('click', { revision: revision }, markAsApproved)
                        .appendTo(insertPoint);
                }
            }

            // On success, 'data' contains a list of products.
            $.each(revisionDetailViewModel.RevisedFileDetails,
                function (key, revisedFileDetailsViewModel) {
                    showRevision(revisionDetailViewModel.Revision, revisedFileDetailsViewModel);
                });
        });
}

//
// show each revised file
//
function showRevision(revisionNumber, revisedFileDetailsViewModel) {

    var lineIndex,
        tableWrapper = $('<div></div>').attr('class', 'revision-table-wrapper'),
        table = $('<table></table>').attr('class', 'revision-file-table'),
        row;
    var lineDetailViewModel;
    var nbLines = revisedFileDetailsViewModel.LineDetails.length;
    var lineFragment;
    var codeCell;

    for (lineIndex = 0; lineIndex < nbLines; lineIndex++) {

        lineDetailViewModel = revisedFileDetailsViewModel.LineDetails[lineIndex];

        lineFragment = $('<tr></tr>')
            .attr('class', 'revision-line ' + getExtraStyleForState(lineDetailViewModel.ChangeState));
 
        table.append(lineFragment);

        if (lineDetailViewModel.ChangeState === 3) {
            $('<td></td>')
                .attr('colspan', '4')
                .attr('class', 'revision-line-text')
                .text( '-- non-modified lines --')
                .appendTo(lineFragment);
        }
        else {
            lineFragment
                .attr('data-revision', revisionNumber)
                .attr('data-file', revisedFileDetailsViewModel.Index)
                .attr('data-line', lineDetailViewModel.LineId)
                .on('click', addNewCommentBox);

            $('<td></td>')
                .attr('class', 'revision-line-number ' + getExtraStyleForState(lineDetailViewModel.ChangeState))
                .text( getRemovedLineNumber(lineDetailViewModel) )
                .appendTo(lineFragment);

            $('<td></td>')
                .attr('class', 'revision-line-number ' + getExtraStyleForState(lineDetailViewModel.ChangeState))
                .text(getAddedLineNumber(lineDetailViewModel))
                .appendTo(lineFragment);

            $('<td></td>')
                .attr('class', 'revision-line-state')
                .text(getChangedSymbol(lineDetailViewModel.ChangeState))
                .appendTo(lineFragment);

            codeCell = $('<td></td>')
                .attr('class', 'revision-line-text')
                .text(getLineText(lineDetailViewModel))
                .appendTo(lineFragment);

            addComments(revisionNumber, revisedFileDetailsViewModel.Index, lineDetailViewModel, codeCell);
        }
    }

    tableWrapper
        .append($('<div></div>')
        .attr('class', 'file-header')
        .append($('<button></button>').text('+'))
        .append($('<span></span>')
        .text(revisedFileDetailsViewModel.ModText + " --> " + revisedFileDetailsViewModel.Filename))
        );

    tableWrapper.append(table);
    
    $('#insertPoint').append(tableWrapper);
}

function showReviews(reviews) {
    var nbReviews = reviews.length;
    var fragment;
    var insertPoint = $('#insertPoint');
    var i;
    for( i = 0; i < nbReviews; i++ ) {
        fragment = createReviewBoxFragment(reviews[i]);
        insertPoint.append(fragment);
    }
}

function createReviewBoxFragment(review) {
    var newBlock = $('<div></div>')
    .attr('class', 'review-line');

    $('<div></div>').attr('class', 'comments-author').text(review.Author).appendTo(newBlock);
    $('<div></div>').attr('class', 'comments-text').text(review.Comment).appendTo(newBlock);

    return newBlock;
}

function markAsApproved(event) {

    var revision = event.data.revision;
    var approver = getUsername1();

    var uri = 'api/commits/approve/' + revision + '/' + approver;
    $.post(uri)
    .done(function() { location.reload(true)}); // TODO
}

function markAsReviewed(event) {
    var revision = event.data.revision;
    var source = $(this);

    var block = $('<div></div>');
    block.attr('class','review-line')
        .attr('data-revision', revision);

    commentEditBoxFragment(postReviewComment, cancelReviewPost).appendTo(block);
    block.insertBefore(source);
}

function cancelReviewPost(event) {
    $(this).parent().remove();
}

function postReviewComment(event) {
    var block = $(this).parent();
    var revision = block.parent().attr('data-revision');
    var textArea = block.find('textarea').first();
    var comment = textArea.val();
    var author = getUsername1();
    var uri;
    var newBlock;

    if (!comment)
        return;

    uri = 'api/commits/comment/' + author + '/' + revision + "?comment=" + encodeURIComponent(comment);

    // we update screen optimistically before post

    newBlock = $('<div></div>');
    
    $('<div></div>').attr('class', 'comments-author').text(author).appendTo(newBlock);
    $('<div></div>').attr('class', 'comments-text').text(comment).appendTo(newBlock);

    newBlock.insertAfter(block);
    block.remove();

    $.post(uri);
}


//
// add comments associated with a line
//
function addComments(revisionNumber, fileId, line, appendToItem) {
    var i;
    var comments = line.Comments;

    for (i = 0; i < comments.length; i++) {
        addComment(comments[i], revisionNumber, fileId, line.LineId, appendToItem);
    }
}

//
// added a comment box
//
function addComment(comment, revisionNumber, fileId, lineId, appendToItem) {

    var appendPoint = appendToItem;
    if ( comment.ReplyToId !== null ) {
        appendPoint = $(appendPoint).children("div[data-idcomment='" + comment.ReplyToId + "']:first");

       if (!appendPoint) alert("insert point not found");
    }

    var commentBox = newCommentFragment(comment.Id, comment.Author, comment.Comment, revisionNumber, fileId, lineId);

    commentBox.appendTo(appendPoint);
}

//
// create html fragment for the comment
//
function newCommentFragment(id, author, comment, revisionNumber, fileId, lineId ) {

    var row, cell, block;

    block = $('<div></div>')
            .attr('class', 'comments-block')
            .attr('data-idComment', id);

    $('<div></div>').attr('class','comments-author').text(author).appendTo(block);
    $('<div></div>').attr('class', 'comments-text').text(comment).appendTo(block);
    
    // anyone can reply to a comment
    commentReplyFragment(addNewReplyBox).appendTo(block);

    return block;
}

//
// inserts a new comment box into the page
//
function addNewCommentBox(event) {

    event.stopPropagation();

    if (event.target.nodeName !== "TD")
        return;

    var line = $(this);
    var commentBox = newCommentBoxFragment(line.attr('data-revision'), line.attr('data-file'), line.attr('data-line'));

    var codeCell = line.children().last();

    codeCell.append(commentBox);
}

function addNewReplyBox(event) {
    event.stopPropagation();
    var parentComment = $(this).parent();
    var commentBox = commentEditBoxFragment( postReplyHandler, cancelReplyHandler);

    commentBox.attr('data-idcomment', parentComment.attr('data-idcomment'));
    commentBox.appendTo(parentComment);
}

function postReplyHandler(event) {
    event.stopPropagation();

    // get id of item to which re reply
    var parent = $(this).parent();
    var idComment = parent.attr('data-idcomment');
    textArea = parent.find('textarea').first();

    var author = getUsername1();
    var comment = textArea.val();

    var uri = '/api/commits/reply/' + idComment + '/' + author + '?comment=' + encodeURIComponent(comment);

    // we update screen optimistically before post
    var block = newCommentFragment( -1, author, comment, null, null, null);

    var toRemove = textArea.parent();
    var insertPoint = toRemove.parent();

    insertPoint.append(block);
    toRemove.remove();

    $.post(uri);
}

function cancelReplyHandler() {
    //alert("cancel reply");
}
    
//
// builds the html fragment for a new comment box
//
function newCommentBoxFragment(revisionNumber, fileId, lineId) {

    var row, cell, block, buttonBar;
    block = commentEditBoxFragment(postComment, cancelComment);
    return block;
}

function commentEditBoxFragment( postCommentHandler, cancelCommentHandler) {
    var block =
        $('<div></div>')
        .attr('class', 'comments-block');

    var textArea =
        $('<textarea></textarea>')
        .attr('class', 'comments-box')
        .appendTo(block);

    $('<button></button>')
        .attr('class', 'button-cancel')
        .text('Cancel')
        .on('click', cancelCommentHandler)
        .appendTo(block);

    $('<button></button>')
        .attr('class', 'button-ok')
        .text('Post')
        .on('click', postCommentHandler)
        .appendTo(block);

    return block;
}

function commentReplyFragment(commentReplyHandler) {

    // button is float right but is badly placed in or out of a div

    var block = $('<button></button>')
        .attr('class', 'button-reply')
        .text('Reply')
        .on('click', commentReplyHandler);

    return block;        
}

//
// handles the cancellation of a new comment
//
function cancelComment() {
    var cell = $(this).parent().parent();
    var row = cell.parent();

    row.remove();
}

//
// handles the post commit button
//
function postComment() {

    var cell = $(this).parent().parent();
    var row = cell.parent();
    var textArea = cell.find('textarea').first();
    var revision = row.attr('data-revision');
    var fileIndex = row.attr('data-file');
    var line = row.attr('data-line');
    var author = getUsername1();
    var comment = textArea.val();

    if (!comment) {
        return;
    }

    var uri = 'api/commits/comment/' + author + '/' + revision + '/' + fileIndex + '/' + line + "?comment=" + encodeURIComponent(comment);

    // we update screen optimistically before post
    var block = newCommentFragment(-1, author, comment, revision, fileIndex, line);

    var toRemove = textArea.parent();
    var insertPoint = toRemove.parent();

    insertPoint.append(block);
    toRemove.remove();

    $.post(uri);
}

//
// retrieves the text to display
//
function getLineText(data) {
    if (data.ChangeState === 3) {
        return "";
    }
    else
        return data.Text;
}

//
// get line number for an addition
//
function getAddedLineNumber(data) {
    if (data.ChangeState === 0 || data.ChangeState === 1) {
        return data.AddedLineNumber
    }
    else if (data.ChangeState == 3) {
        return "...";
    }

    return "";
}

//
// get line number of removed line
//
function getRemovedLineNumber(data) {
    if (data.ChangeState === 0 || data.ChangeState === 2) {
        return data.RemovedLineNumber
    }
    else if (data.ChangeState == 3) {
        return "...";
    }

    return "";
}

//
// get the css rule according to line state
//
function getExtraStyleForState(state) {
    if (state === 0) {
        return "state-none";
    }
    else if (state === 1) {
        return "state-added";
    }
    else if (state === 2) {
        return "state-removed";
    }

    return "state-break";
}

//
// get symbol (- or +) according to line state
//
function getChangedSymbol(state) {

    if (state === 1) {
        return "+";
    }
    else if (state === 2) {
        return "-";
    }
    return "";
}



// TOOD refactor
function createUser() {

    var userName = $('#userName').val();
    var password = $('#pwd').val();
    var confirm = $('#confirmPwd').val();

    if (!userName) {
        alert("usernamle required");
        return;
    }

    if (!password) {
        alert("password required");
        return;
    }

    if (password.length < 8) {
        alert("min 8 caracters please");
        return;
    }

    if (!confirm ) {
        alert("no confirm");
        return;
    }

    if (password !== confirm) {
        alert("confirmed not same");
        return;
    }

    $.post('api/users/create/' + userName + '?password=' + encodeURIComponent(password))
        .done(function () { alert(userName + ' created'); })
        .fail(function (xhr, textStatus, error) {
            alert(xhr.responseJSON.ExceptionMessage);
        });
}
