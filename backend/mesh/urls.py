from django.urls import path
from .views import MeshViewSet, ChatRoomViewSet, ChatRequestViewSet

# MeshViewSet routes
mesh_pull = MeshViewSet.as_view({'get': 'pull'})
mesh_relay = MeshViewSet.as_view({'post': 'relay'})
mesh_discover = MeshViewSet.as_view({'post': 'discover'})
mesh_peers = MeshViewSet.as_view({'get': 'peers'})
mesh_status = MeshViewSet.as_view({'get': 'status'})

# ChatRoomViewSet routes
room_list = ChatRoomViewSet.as_view({'get': 'list', 'post': 'create'})
room_detail = ChatRoomViewSet.as_view({'get': 'retrieve', 'delete': 'destroy'})
room_messages = ChatRoomViewSet.as_view({'get': 'messages'})
room_send = ChatRoomViewSet.as_view({'post': 'send_message'})
room_reaction = ChatRoomViewSet.as_view({'post': 'add_reaction'})
room_leave = ChatRoomViewSet.as_view({'post': 'leave'})
room_invite = ChatRoomViewSet.as_view({'post': 'invite'})
room_discover_peers = ChatRoomViewSet.as_view({'get': 'discover_peers'})
room_join_by_code = ChatRoomViewSet.as_view({'get': 'join_by_code'})

# ChatRequestViewSet routes (FIXED: no 'list' action)
request_create = ChatRequestViewSet.as_view({'post': 'create'})
request_received = ChatRequestViewSet.as_view({'get': 'received'})
request_sent = ChatRequestViewSet.as_view({'get': 'sent'})
request_accept = ChatRequestViewSet.as_view({'post': 'accept'})
request_decline = ChatRequestViewSet.as_view({'post': 'decline'})

urlpatterns = [
    # Mesh endpoints
    path('pull/', mesh_pull, name='mesh-pull'),
    path('relay/', mesh_relay, name='mesh-relay'),
    path('discover/', mesh_discover, name='mesh-discover'),
    path('peers/', mesh_peers, name='mesh-peers'),
    path('status/', mesh_status, name='mesh-status'),
    
    # Chat Room endpoints
    path('rooms/', room_list, name='room-list'),
    path('rooms/<uuid:pk>/', room_detail, name='room-detail'),
    path('rooms/<uuid:pk>/messages/', room_messages, name='room-messages'),
    path('rooms/<uuid:pk>/send_message/', room_send, name='room-send'),
    path('rooms/<uuid:pk>/add_reaction/', room_reaction, name='room-reaction'),
    path('rooms/<uuid:pk>/leave/', room_leave, name='room-leave'),
    path('rooms/<uuid:pk>/invite/', room_invite, name='room-invite'),
    path('rooms/discover_peers/', room_discover_peers, name='room-discover-peers'),
    path('rooms/join_by_code/', room_join_by_code, name='room-join-by-code'),
    
    # Chat Request endpoints (FIXED)
    path('requests/', request_create, name='request-create'),
    path('requests/received/', request_received, name='request-received'),
    path('requests/sent/', request_sent, name='request-sent'),
    path('requests/<uuid:pk>/accept/', request_accept, name='request-accept'),
    path('requests/<uuid:pk>/decline/', request_decline, name='request-decline'),
]