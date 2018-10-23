import React from 'react';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import { translate } from 'react-i18next';
import Autolinker from 'autolinker';

import NoteRoot from 'components/NoteRoot';
import NoteReply from 'components/NoteReply';

import core from 'core';
import actions from 'actions';
import selectors from 'selectors';

import './Note.scss';

class Note extends React.PureComponent {
  static propTypes = {
    annotation: PropTypes.object.isRequired,
    isNoteEditing: PropTypes.bool.isRequired,
    isNoteExpanded: PropTypes.bool.isRequired,
    setIsNoteEditing: PropTypes.func.isRequired,
    measure: PropTypes.func.isRequired,
    searchInput: PropTypes.string,
    isReadOnly: PropTypes.bool,
    t: PropTypes.func.isRequired
  };

  constructor(props) {
    super(props);
    this.replyTextarea = React.createRef();
    this.state = {
      replies: props.annotation.getReplies(),
      isRootContentEditing: false,
      isReplyFocused: false
    };
  }

  componentDidMount() {
    core.addEventListener('addReply', this.onAddReply);
    core.addEventListener('deleteReply', this.onDeleteReply);
  }

  componentDidUpdate(prevProps, prevState) {
    const { annotation } = this.props;
    const commentEditable = core.canModify(annotation) && !annotation.getContents();
    
    const noteBeingEdited = !prevProps.isNoteEditing && this.props.isNoteEditing; 
    if (noteBeingEdited) {
      if (commentEditable) {
        this.openRootEditing();
      } else {
        this.replyTextarea.current.focus();
      }
    }
    
    const noteCollapsed = prevProps.isNoteExpanded && !this.props.isNoteExpanded; 
    if(noteCollapsed) {
      this.setState({
        isRootContentEditing: false,
        isReplyFocused: false
      });
    }

    const noteHeightChanged = prevProps.isNoteExpanded !== this.props.isNoteExpanded
                          || prevState.replies.length !== this.state.replies.length
                          || prevState.isRootContentEditing !== this.state.isRootContentEditing
                          || prevState.isReplyFocused !== this.state.isReplyFocused;
    if (noteHeightChanged) {
      this.props.measure();
    }
  }

  componentWillUnmount() {
    core.removeEventListener('addReply', this.onAddReply);
    core.removeEventListener('deleteReply', this.onDeleteReply);
  }

  onAddReply = (e, reply, parent) => {
    if (parent === this.props.annotation) {
      this.setState({
        replies: [ ...parent.getReplies() ]
      }, this.props.measure); // TODO prevState.replies === this.state.replies.length only when adding the first reply
    }
  }

  onDeleteReply = (e, reply, parent) => {
    if (parent === this.props.annotation) {
      this.setState({
        replies: parent.getReplies().filter(a => a !== reply)
      });
    }
  }

  onClickNote = e => {
    e.stopPropagation();

    const { isNoteExpanded, annotation } = this.props;

    if (isNoteExpanded) {
      core.deselectAnnotation(annotation);
    } else {
      core.deselectAllAnnotations();
      core.selectAnnotation(annotation);
      core.jumpToAnnotation(annotation);
    }
  }

  openRootEditing = () => {
    this.setState({ isRootContentEditing: true });
  }

  closeRootEditing = () => {
    this.setState({ isRootContentEditing: false });
    this.props.setIsNoteEditing(false);
  }

  onInput = () => {
    const height = parseFloat(window.getComputedStyle(this.replyTextarea.current).height);
    const scrollHeight = this.replyTextarea.current.scrollHeight;

    if (height !== scrollHeight + 2) {
      this.replyTextarea.current.style.height = `${scrollHeight + 2}px`;
      this.props.measure();
    } 
  }

  onKeyDown = e => {
    if ((e.metaKey || e.ctrlKey) && e.which === 13) { // (Cmd/Ctrl + Enter)
      this.postReply(e);
    }
  }

  onFocus = () => {
    this.setState({ isReplyFocused: true, isRootContentEditing: false });
  }

  onBlur = () => {
    this.setState({ isReplyFocused: false });
    this.props.setIsNoteEditing(false);
  }

  postReply = e => {
    e.preventDefault();

    if (this.replyTextarea.current.value.trim().length > 0) {
      core.createAnnotationReply(this.props.annotation, this.replyTextarea.current.value);
      this.clearReply();
    }
  }

  onClickCancel = () => {
    this.clearReply();
    this.setState({ isReplyFocused: false });
    // This is for IE Edge
    this.replyTextarea.current.blur();
  }

  clearReply = () => {
    this.replyTextarea.current.value = '';
    this.replyTextarea.current.style.height = '30px';
  }

  renderAuthorName = annotation => {
    const name = core.getDisplayAuthor(annotation);

    if (!name) {
      return '(no name)';
    }

    return <span className="author" dangerouslySetInnerHTML={{__html: this.getText(name)}}></span>;
  }

  renderContents = contents => {
    if (!contents) {
      return null;
    }

    let text;
    const isContentsLinkable = Autolinker.link(contents).indexOf('<a') !== -1;
    if (isContentsLinkable) {
      const linkedContent = Autolinker.link(contents);
      // if searchInput is 't', replace <a ...>text</a> with
      // <a ...><span class="highlight">t</span>ext</a>
      text = linkedContent.replace(/>(.+)</i, (_, p1) => `>${this.getText(p1)}<`);
    } else {
      text = this.getText(contents);
    }

    return <span className="contents" dangerouslySetInnerHTML={{__html: text}}></span>; 
  }

  getText = text => {
    if (this.props.searchInput.trim()) {
      return this.getHighlightedText(text);
    }

    return text;
  }

  getHighlightedText = text => {
    const regex = new RegExp(`(${this.props.searchInput})`, 'gi');

    return text.replace(regex, '<span class="highlight">$1</span>');
  }

  render() {
    const { annotation, t, isReadOnly, isNoteExpanded, searchInput, measure }  = this.props;
    const { replies, isRootContentEditing, isReplyFocused } = this.state;
    const className = [
      'Note',
      isNoteExpanded ? 'expanded' : ''
    ].join(' ').trim();

    return (
      <div className={className} onClick={this.onClickNote}>
        <NoteRoot
          annotation={annotation}
          searchInput={searchInput}
          renderAuthorName={this.renderAuthorName}
          renderContents={this.renderContents}
          isNoteExpanded={isNoteExpanded}
          isEditing={isRootContentEditing}
          openEditing={this.openRootEditing}
          closeEditing={this.closeRootEditing}
          numberOfReplies={replies.length}
          measure={measure}
        />

        <div className={`replies ${isNoteExpanded ? 'visible' : 'hidden'}`}>
          {replies.map(reply => 
            <NoteReply 
              key={reply.Id} 
              reply={reply} 
              searchInput={searchInput} 
              measure={measure}
              renderAuthorName={this.renderAuthorName} 
              renderContents={this.renderContents} 
            />
          )}
          {!isReadOnly &&
            <div className="add-reply" onClick={e => e.stopPropagation()}>
              <textarea 
                ref={this.replyTextarea} 
                onInput={this.onInput} 
                onKeyDown={this.onKeyDown} 
                onBlur={this.onBlur} 
                onFocus={this.onFocus} 
                placeholder="Reply..." 
              />
              {isReplyFocused &&
                <div className="buttons" onMouseDown={e => e.preventDefault()}>
                  <button onMouseDown={this.postReply}>{t('action.reply')}</button>
                  <button onMouseDown={this.onClickCancel}>{t('action.cancel')}</button>
                </div>
              }
            </div>
          }
        </div>
    </div>
    );
  }
}

const mapStateToProps = (state, ownProps) => ({
  isNoteExpanded: selectors.isNoteExpanded(state, ownProps.annotation.Id),
  isNoteEditing: selectors.isNoteEditing(state, ownProps.annotation.Id),
  isReadOnly: selectors.isDocumentReadOnly(state)
});

const matDispatchToProps = {
  setIsNoteEditing: actions.setIsNoteEditing,
};

export default connect(mapStateToProps, matDispatchToProps)(translate(null, {wait: false})(Note));

