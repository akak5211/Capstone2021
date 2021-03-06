import React, { Component } from 'react'
import Modal from 'react-bootstrap/Modal';
import Button from 'react-bootstrap/Button';
import Form from 'react-bootstrap/Form';
import Badge from 'react-bootstrap/Badge';
import firebase from "../../../firebase";
import {
    setCurrentChatRoom, setPrivateChatRoom,
} from '../../../redux/actions/chatRoom_action';
import { connect } from 'react-redux';
import { FaDAndD, FaPlus } from 'react-icons/fa';
import { FaRegSmileWink } from 'react-icons/fa';

export class ChatRooms extends Component {

    state = {
        chatRoomsRef: firebase.database().ref("chatRooms"),
        messagesRef: firebase.database().ref("messages"),
        show: false,
        name: "",
        description: "",
        chatRooms: [],
        activeChatRoomId: "",
        firstLoad: true,

        notifications: []
    }

    componentDidMount() {
        this.AddChatRoomsListeners()
    }

    componentWillUnmount() {
        this.state.chatRoomsRef.off();

        this.state.chatRooms.forEach(chatRoom => {
            this.state.messagesRef.child(chatRoom.id).off();
        });
    }

    handleClose = () => this.setState({ show: false })
    handleShow = () => this.setState({ show: true })

    setFirstChatRoom = () => {
        const firstChatRoom = this.state.chatRooms[0];
        if (this.state.firstLoad && this.state.chatRooms.length > 0) {
            this.props.dispatch(setCurrentChatRoom(firstChatRoom))
            this.setState({ activeChatRoomId: firstChatRoom.id })
        }
        this.setState({ firstLoad: false })
    }


    AddChatRoomsListeners = () => {
        let chatRommsArray = []
        // chatRoomsRef.on(eventType, callback)
        this.state.chatRoomsRef.on("child_added", DataSnapshot => {
            chatRommsArray.push(DataSnapshot.val());
            this.setState({ chatRooms: chatRommsArray }, () => this.setFirstChatRoom());
            // DataSnapshot.key === chatRoomId
            this.addNotificationListener(DataSnapshot.key);
        })
    }

    addNotificationListener = chatRoomId => {
        this.state.messagesRef.child(chatRoomId).on("value", DataSnapshot => {
            if (this.props.chatRoom) {

                this.handleNotifications(
                    chatRoomId,
                    this.props.chatRoom.id,  // ?????? ????????? ?????????
                    this.state.notifications,
                    DataSnapshot
                )
            }
        })
    }

    handleNotifications = (chatRoomId, currentChatRoomId, notifications, DataSnapshot) => {
        let lastTotal = 0;

        //?????? notifications State??? ?????? ?????? ???????????? ?????? notification ????????? ??????????????? ?????? ??????  
        let index = notifications.findIndex(
            notification => notification.id === chatRoomId
        );
        // console.log('notifications', notifications)

        // notification??? chatRoomId??? ?????? ?????? ?????? ???
        if (index === -1) {
            notifications.push({
                id: chatRoomId,
                total: DataSnapshot.numChildren(),
                lastKnownTotal: DataSnapshot.numChildren(),
                count: 0
            })
        }
        //?????? notifications?????? ?????? chatRoom ???????????? ?????? ???
        else {
            //???????????? ?????? ????????? ??? ?????? ???????????? ?????? ?????? ???
            if (chatRoomId !== currentChatRoomId) {
                //???????????? ????????? ????????? ??? ????????? ??????
                lastTotal = notifications[index].lastKnownTotal;

                //count (???????????? ????????? ??????)??? ????????? 
                //?????? ??? ????????? ?????? - ????????? ????????? ??? ????????? ?????? > 0
                //?????? ??? ????????? ????????? 10????????? ????????? ????????? ??? 8???????????? 2?????? ???????????? ???????????? ???.
                if (DataSnapshot.numChildren() - lastTotal > 0) {
                    notifications[index].count = DataSnapshot.numChildren() - lastTotal;
                }
            }
            //total property??? ?????? ?????? ????????? ????????? ????????????
            notifications[index].total = DataSnapshot.numChildren();
        }
        this.setState({ notifications });

    }

    getNotificationCount = chatRoom => {
        let count = 0;

        this.state.notifications.forEach(notification => {
            if (notification.id === chatRoom.id) {
                count = notification.count;
            }
        });

        if (count > 0) return count;
    };

    handleSubmit = (e) => {
        e.preventDefault();
        const { name, description } = this.state;

        if (this.isFormValid(name, description)) {
            this.addChatRoom();
        }
    }

    addChatRoom = async () => {

        const key = this.state.chatRoomsRef.push().key;
        const { name, description } = this.state;
        const { user } = this.props;
        const newChatRoom = {
            id: key,
            name: name,
            description: description,
            createdBy: {
                name: user.displayName,
                image: user.photoURL,
                video: " "
            }
        };

        try {
            await this.state.chatRoomsRef.child(key).update(newChatRoom);
            this.setState({
                name: "",
                description: "",
                show: false
            })
        } catch (error) {
            alert(error)
        }

    };

    changeChatRoom = (chatRoom) => {
        this.props.dispatch(setCurrentChatRoom(chatRoom));
        this.setState({ activeChatRoomId: chatRoom.id });
        this.props.dispatch(setPrivateChatRoom(false));
        this.clearNotifications();
    }

    clearNotifications = () => {
        let index = this.state.notifications.findIndex(
            notification => notification.id === this.props.chatRoom.id
        );

        if (index !== -1) {
            let updatedNotifications = [...this.state.notifications];
            updatedNotifications[index].lastKnownTotal = this.state.notifications[
                index
            ].total;
            updatedNotifications[index].count = 0;
            this.setState({ notifications: updatedNotifications });
        }
    };

    renderChatrooms = chatRooms =>
        chatRooms.length > 0 &&
        chatRooms.map(room => (
            <li
                key={room.id}
                onClick={() => this.changeChatRoom(room)}
                style={{
                    backgroundColor: room.id === this.state.activeChatRoomId && "#ffffff45"
                }}
            >
                # {room.name}
                {this.getNotificationCount(room) &&
                    (<Badge style={{ float: 'right', marginTop: '4px' }} variant="danger">
                        {this.getNotificationCount(room)}
                    </Badge>)}
            </li>
        ));


    isFormValid = (name, description) =>
        name && description;

    render() {
        const { chatRooms, show, } = this.state;

        return (
            <>

                <div style={{
                    position: 'relative', width: '100%',
                    display: 'flex', alignItems: 'center'
                }}>
                    <FaRegSmileWink style={{ marginRight: 3 }} />
                    CHAT ROOMS{" "} ({chatRooms.length})

                        <FaPlus
                        style={{
                            position: 'absolute',
                            right: 0, cursor: 'pointer'
                        }}
                        onClick={this.handleShow}
                    />
                </div>

                <ul style={{ listStyleType: 'none', padding: '0' }}>
                    {this.renderChatrooms(chatRooms)}
                </ul>

                {/* ADD ChatRoom Modal */}
                <Modal show={show} onHide={this.handleClose}>
                    <Modal.Header closeButton>
                        <Modal.Title>Create a chat room</Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <Form onSubmit={this.handleSubmit}>
                            <Form.Group controlId="formBasicEmail">
                                <Form.Label>Name</Form.Label>
                                <Form.Control
                                    onChange={(e) => this.setState({ name: e.target.value })}
                                    type="text" 
                                    placeholder="Enter chat room name"
                                />
                            </Form.Group>

                            <Form.Group controlId="formBasicPassword">
                                <Form.Label>Description</Form.Label>
                                <Form.Control
                                    onChange={(e) => this.setState({ description: e.target.value })}
                                    type="text"
                                    placeholder="Enter chat room description"
                                />
                            </Form.Group>
                        </Form>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button variant="secondary" onClick={this.handleClose}>
                            Close
                        </Button>
                        <Button variant="primary" onClick={this.handleSubmit}>
                            Save Changes
                        </Button>
                    </Modal.Footer>
                </Modal>
            </>
        )
    }
}

const mapStateToProps = state => {
    return {
        user: state.user.currentUser,
        chatRoom: state.chatRoom.currentChatRoom
    };
};

export default connect(mapStateToProps)(ChatRooms);

