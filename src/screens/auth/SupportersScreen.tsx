// src/screens/auth/SupportersScreen.tsx

import React, { useState, useEffect, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Share,
  TouchableWithoutFeedback,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Contacts from 'react-native-contacts';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../services/supabase/supabaseClient';
import { AuthContext } from '../../context/AuthContext';
import { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import debounce from 'lodash/debounce';
import { Platform, PermissionsAndroid} from 'react-native';

interface Friend {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  profilePicture: string;
}

interface Profile {
  id: string;
  username: string;
  firstName: string;
  lastName: string;
  avatar_url: string;
}

const SupportersScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useContext(AuthContext);

  const [currentFriends, setCurrentFriends] = useState<Friend[]>([]);
  const [pendingFriends, setPendingFriends] = useState<Friend[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [friendUsername, setFriendUsername] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [suggestedProfiles, setSuggestedProfiles] = useState<Profile[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState<boolean>(false);
  const [sentFriends, setSentFriends] = useState<Friend[]>([]);

  useEffect(() => {
    let subscription: any;

    if (user) {
      fetchFriends();
      fetchPendingFriendRequests();
      fetchSentFriendRequests();
      subscription = subscribeToFriendships();
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [user]);

  // Subscribe to real-time changes in friendships
  const subscribeToFriendships = () => {
    const subscription = supabase
      .channel('friendships-changes')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'friendships' },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('INSERT Change received!', payload);
          fetchFriends();
          fetchPendingFriendRequests();
          fetchSentFriendRequests();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'friendships' },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('UPDATE Change received!', payload);
          fetchFriends();
          fetchPendingFriendRequests();
          fetchSentFriendRequests();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'friendships' },
        (payload: RealtimePostgresChangesPayload<any>) => {
          console.log('DELETE Change received!', payload);
          fetchFriends();
          fetchPendingFriendRequests();
          fetchSentFriendRequests();
        }
      )
      .subscribe();
  
    return subscription;
  };

  // Fetch accepted friends
  const fetchFriends = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          requester:profiles!requester_id (
            id, username, first_name, last_name, avatar_url
          ),
          receiver:profiles!receiver_id (
            id, username, first_name, last_name, avatar_url
          )
        `)
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .eq('status', 'accepted');

      if (error) {
        throw error;
      }

      const friends: Friend[] = data.map((friendship: any) => {
        const profile =
          friendship.requester_id === user.id
            ? friendship.receiver
            : friendship.requester;

        return {
          id: profile.id,
          username: profile.username,
          firstName: profile.first_name,
          lastName: profile.last_name,
          profilePicture: profile.avatar_url || 'https://via.placeholder.com/150',
        };
      });

      setCurrentFriends(friends);
    } catch (error: any) {
      console.error('Error fetching friends:', error.message);
      Alert.alert('Error', 'Failed to fetch friends.');
    }
  };

  // Fetch pending friend requests where user is the receiver
  const fetchPendingFriendRequests = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          requester:profiles!requester_id (
            id, username, first_name, last_name, avatar_url
          )
        `)
        .eq('receiver_id', user.id)
        .eq('status', 'pending');

      if (error) {
        throw error;
      }

      const pending: Friend[] = data.map((friendship: any) => {
        const requester = friendship.requester;

        return {
          id: requester.id,
          username: requester.username,
          firstName: requester.first_name,
          lastName: requester.last_name,
          profilePicture: requester.avatar_url || 'https://via.placeholder.com/150',
        };
      });

      setPendingFriends(pending);
    } catch (error: any) {
      console.error('Error fetching pending requests:', error.message);
      Alert.alert('Error', 'Failed to fetch pending friend requests.');
    }
  };

  // Fetch suggested profiles based on search query
  const fetchSuggestedProfiles = async (query: string) => {
    if (!query.trim()) {
      setSuggestedProfiles([]);
      return;
    }

    try {
      setSuggestionsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, first_name, last_name, avatar_url')
        .or(`username.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%`)
        .neq('id', user?.id)
        .limit(10);

      if (error) {
        throw error;
      }

      setSuggestedProfiles(data.map(profile => ({
        id: profile.id,
        username: profile.username,
        firstName: profile.first_name,
        lastName: profile.last_name,
        avatar_url: profile.avatar_url,
      })));
    } catch (error: any) {
      console.error('Error fetching suggested profiles:', error.message);
    } finally {
      setSuggestionsLoading(false);
    }
  };

  // Debounced version of fetchSuggestedProfiles
  const debouncedFetchSuggestions = useCallback(debounce(fetchSuggestedProfiles, 300), [user]);

  // Handle text input change
  const handleFriendUsernameChange = (text: string) => {
    setFriendUsername(text);
    debouncedFetchSuggestions(text);
  };

  // Handle accepting a friend request
  const handleAccept = async (friend: Friend) => {
    if (!user) return;

    Alert.alert(
      'Accept Friend Request',
      `Are you sure you want to accept ${friend.username}'s friend request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Accept',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('friendships')
                .update({ status: 'accepted' })
                .match({
                  requester_id: friend.id,
                  receiver_id: user.id,
                  status: 'pending',
                });

              if (error) throw error;

              // **Immediate State Update**
              setPendingFriends((prev) => prev.filter((f) => f.id !== friend.id));
              setCurrentFriends((prev) => [
                ...prev,
                {
                  ...friend,
                  status: 'accepted', // Optionally add status
                },
              ]);

              Alert.alert('Success', `You are now friends with ${friend.username}.`);
            } catch (error: any) {
              console.error('Error accepting friend request:', error.message);
              Alert.alert('Error', 'Failed to accept friend request.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Handle declining a friend request
  const handleDecline = async (friend: Friend) => {
    if (!user) return;

    Alert.alert(
      'Decline Friend Request',
      `Are you sure you want to decline ${friend.username}'s friend request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('friendships')
                .delete()
                .match({
                  requester_id: friend.id,
                  receiver_id: user.id,
                  status: 'pending',
                });

              if (error) throw error;

              // **Immediate State Update**
              setPendingFriends((prev) => prev.filter((f) => f.id !== friend.id));

              Alert.alert('Declined', `You have declined ${friend.username}'s friend request.`);
            } catch (error: any) {
              console.error('Error declining friend request:', error.message);
              Alert.alert('Error', 'Failed to decline friend request.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // fetch friend requests sent by the user that are pending
  const fetchSentFriendRequests = async () => {
    if (!user) return;
  
    try {
      const { data, error } = await supabase
        .from('friendships')
        .select(`
          *,
          receiver:profiles!receiver_id (
            id, username, first_name, last_name, avatar_url
          )
        `)
        .eq('requester_id', user.id)
        .eq('status', 'pending');
  
      if (error) {
        throw error;
      }
  
      const sent: Friend[] = data.map((friendship: any) => {
        const receiver = friendship.receiver;
  
        return {
          id: receiver.id,
          username: receiver.username,
          firstName: receiver.first_name,
          lastName: receiver.last_name,
          profilePicture: receiver.avatar_url || 'https://via.placeholder.com/150',
        };
      });
  
      setSentFriends(sent);
    } catch (error: any) {
      console.error('Error fetching sent friend requests:', error.message);
      Alert.alert('Error', 'Failed to fetch sent friend requests.');
    }
  };

  const handleCancelFriendRequest = async (friendId: string, friendUsername: string) => {
  Alert.alert(
    'Cancel Friend Request',
    `Are you sure you want to cancel your friend request to ${friendUsername}?`,
    [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          if (!user) return;

          try {
            const { error } = await supabase
              .from('friendships')
              .delete()
              .match({
                requester_id: user.id,
                receiver_id: friendId,
                status: 'pending',
              });

            if (error) throw error;

            // **Immediate State Update**
            setSentFriends((prev) => prev.filter((f) => f.id !== friendId));

            Alert.alert('Cancelled', `Friend request to ${friendUsername} has been cancelled.`);
          } catch (error: any) {
            console.error('Error cancelling friend request:', error.message);
            Alert.alert('Error', 'Failed to cancel friend request.');
          }
        },
      },
    ],
    { cancelable: true }
  );
};


  // Handle sending a friend request from suggested profile
  const handleSendFriendRequest = async (profile: Profile) => {
    if (!user) return;

    try {
      setLoading(true);

      // Prevent sending friend request to self
      if (profile.id === user.id) {
        Alert.alert('Invalid Action', 'You cannot send a friend request to yourself.');
        return;
      }

      // Check if friendship already exists
      const { data: existingFriendship, error: friendshipError } = await supabase
        .from('friendships')
        .select('*')
        .or(`and(requester_id.eq.${user.id},receiver_id.eq.${profile.id}),and(requester_id.eq.${profile.id},receiver_id.eq.${user.id})`)
        .maybeSingle();

      if (friendshipError) {
        throw friendshipError;
      }

      if (existingFriendship) {
        if (existingFriendship.status === 'pending') {
          Alert.alert('Request Pending', 'A friend request is already pending with this user.');
        } else if (existingFriendship.status === 'accepted') {
          Alert.alert('Already Friends', 'You are already friends with this user.');
        }
        return;
      }

      // Create a new friendship entry with status 'pending'
      const { error } = await supabase
        .from('friendships')
        .insert([
          {
            requester_id: user.id,
            receiver_id: profile.id,
            status: 'pending',
          },
        ]);

      if (error) {
        throw error;
      }

      // **Immediate State Update**
      setSentFriends((prev) => [
        ...prev,
        {
          id: profile.id,
          username: profile.username,
          firstName: profile.firstName,
          lastName: profile.lastName,
          profilePicture: profile.avatar_url || 'https://via.placeholder.com/150',
        },
      ]);

      Alert.alert('Success', `Friend request sent to ${profile.username}.`);
      setFriendUsername('');
      setSuggestedProfiles([]);
    } catch (error: any) {
      console.error('Error sending friend request:', error.message);
      Alert.alert('Error', 'Failed to send friend request.');
    } finally {
      setLoading(false);
    }
  };

  // Handle adding friends via contacts
  const handleAddViaContacts = async () => {
    Alert.alert(
      'Contacts Permission',
      '"FocusPact" would like to access your contacts\n\nAllow access to your contacts so you can find friends on FocusPact. We will periodically sync and securely store your contacts, but we will never share them.',
      [
        {
          text: 'Cancel',
          onPress: () => console.log('Contacts permission denied'),
          style: 'cancel',
        },
        {
          text: 'OK',
          onPress: async () => {
            try {
              let permission = false;

              if (Platform.OS === 'android') {
                const granted = await PermissionsAndroid.request(
                  PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
                  {
                    title: '"FocusPact" Contacts Permission',
                    message:
                      'Allow access to your contacts so you can find friends on FocusPact. We will periodically sync and securely store your contacts, but we will never share them.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                  }
                );
                permission = granted === PermissionsAndroid.RESULTS.GRANTED;
              } else {
                const auth = await Contacts.requestPermission();
                permission = auth === 'authorized';
              }

              if (permission) {
                const contacts = await Contacts.getAll();
                console.log('Fetched Contacts:', contacts);
                // Proceed with processing contacts (e.g., matching with existing users)
                Alert.alert('Success', 'Contacts have been accessed successfully.');
              } else {
                Alert.alert(
                  'Permission Denied',
                  'Cannot access contacts without permission.'
                );
              }
            } catch (error: any) {
              console.error('Error accessing contacts:', error.message);
              Alert.alert('Error', 'Failed to access contacts.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Handle adding friends via QR Code
  const handleAddViaQRCode = () => {
    navigation.navigate('QRCodeScanner' as never); // Ensure you have a QRCodeScanner screen
  };

  // Handle sharing invite link
  const handleShareLink = async () => {
    try {
      const result = await Share.share({
        message:
          'Join me on FocusPact! Here is my invite link: https://focuspact.app/invite?ref=your-ref-code',
      });

      if (result.action === Share.sharedAction) {
        if (result.activityType) {
          // Shared with specific activity type
        } else {
          // Shared successfully
        }
      } else if (result.action === Share.dismissedAction) {
        // Share dialog dismissed
      }
    } catch (error: any) {
      console.error('Error sharing link:', error.message);
      Alert.alert('Error', 'Failed to share the link.');
    }
  };

  // Handle removing a friend
  const handleRemoveFriend = async (friendId: string, friendUsername: string) => {
    Alert.alert(
      'Remove Friend',
      `Are you sure you want to remove ${friendUsername} from your friends?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            if (!user) return;

            try {
              const { error } = await supabase
                .from('friendships')
                .delete()
                .or(
                  `and(requester_id.eq.${user.id},receiver_id.eq.${friendId}),and(requester_id.eq.${friendId},receiver_id.eq.${user.id})`
                );

              if (error) throw error;

              Alert.alert('Success', `You have removed ${friendUsername} from your friends.`);
            } catch (error: any) {
              console.error('Error removing friend:', error.message);
              Alert.alert('Error', 'Failed to remove friend.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  // Render a single sent friend request item
const renderSentFriendItem = ({ item }: { item: Friend }) => (
  <View style={styles.sentFriendItem}>
    <Image source={{ uri: item.profilePicture }} style={styles.profilePicture} />
    <View style={styles.friendInfo}>
      <Text style={styles.usernameText}>{item.username}</Text>
      <Text style={styles.fullName}>
        {item.firstName} {item.lastName}
      </Text>
    </View>
    <TouchableOpacity
      onPress={() => handleCancelFriendRequest(item.id, item.username)}
      style={styles.cancelButton}
    >
      <Ionicons name="close-circle" size={24} color="#F44336" />
    </TouchableOpacity>
  </View>
);

  // Filter friends based on search query
  const filteredCurrentFriends = currentFriends.filter(
    (friend) =>
      friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPendingFriends = pendingFriends.filter(
    (friend) =>
      friend.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      friend.lastName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  

  // Render a single friend item
  const renderFriendItem = ({ item }: { item: Friend }) => (
    <View style={styles.friendItem}>
      <Image source={{ uri: item.profilePicture }} style={styles.profilePicture} />
      <View style={styles.friendInfo}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.fullName}>
          {item.firstName} {item.lastName}
        </Text>
      </View>
      <TouchableOpacity
        onPress={() => handleRemoveFriend(item.id, item.username)}
        style={styles.removeButton}
      >
        <Ionicons name="trash" size={24} color="#F44336" />
      </TouchableOpacity>
    </View>
  );

  // Render a single pending friend request item
  const renderPendingFriendItem = ({ item }: { item: Friend }) => (
    <View style={styles.pendingFriendItem}>
      <Image source={{ uri: item.profilePicture }} style={styles.profilePicture} />
      <View style={styles.friendInfo}>
        <Text style={styles.username}>{item.username}</Text>
        <Text style={styles.fullName}>
          {item.firstName} {item.lastName}
        </Text>
      </View>
      <View style={styles.actionButtons}>
        <TouchableOpacity onPress={() => handleAccept(item)} style={styles.acceptButton}>
          <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => handleDecline(item)} style={styles.declineButton}>
          <Ionicons name="close-circle" size={24} color="#F44336" />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render a single suggested profile item
  const renderSuggestedProfileItem = ({ item }: { item: Profile }) => (
    <TouchableWithoutFeedback onPress={() => handleSendFriendRequest(item)}>
      <View style={styles.suggestedProfileItem}>
        <Image source={{ uri: item.avatar_url || 'https://via.placeholder.com/150' }} style={styles.profilePicture} />
        <View style={styles.profileInfo}>
          <Text style={styles.usernameText}>{item.username}</Text>
          <Text style={styles.fullName}>
            {item.firstName} {item.lastName}
          </Text>
        </View>
        <Ionicons name="person-add" size={24} color="#4CAF50" />
      </View>
    </TouchableWithoutFeedback>
  );

  return (
    <View style={styles.container}>
      {/* Add Friend via Username */}
      <View style={styles.addFriendContainer}>
        <TextInput
          style={styles.input}
          placeholder="Enter friend's username or name"
          value={friendUsername}
          onChangeText={handleFriendUsernameChange}
          autoCapitalize="none"
          textContentType="username"
        />
        {loading && <ActivityIndicator style={styles.loadingIndicator} />}
      </View>

      {/* Suggested Profiles */}
      {suggestedProfiles.length > 0 && (
        <FlatList
          data={suggestedProfiles}
          keyExtractor={(item) => item.id}
          renderItem={renderSuggestedProfileItem}
          style={styles.suggestionsList}
          keyboardShouldPersistTaps="handled"
          ListEmptyComponent={<Text style={styles.emptyText}>No suggestions found.</Text>}
        />
      )}
      {suggestionsLoading && <ActivityIndicator style={styles.suggestionsLoading} />}

      {/* Current Friends */}
      <Text style={styles.sectionTitle}>Current Friends</Text>
      <FlatList
        data={filteredCurrentFriends}
        keyExtractor={(item) => item.id}
        renderItem={renderFriendItem}
        ListEmptyComponent={<Text style={styles.emptyText}>No current friends.</Text>}
      />

      {/* Pending Friend Requests */}
      <Text style={styles.sectionTitle}>Pending Requests</Text>
      <FlatList
        data={filteredPendingFriends}
        keyExtractor={(item) => item.id}
        renderItem={renderPendingFriendItem}
        ListEmptyComponent={<Text style={styles.emptyText}>No pending requests.</Text>}
      />

      {/* Sent Friend Requests */}
      <Text style={styles.sectionTitle}>Sent Friend Requests</Text>
      <FlatList
        data={sentFriends}
        keyExtractor={(item) => item.id}
        renderItem={renderSentFriendItem}
        ListEmptyComponent={<Text style={styles.emptyText}>No sent friend requests.</Text>}
      />

      {/* Add Friends Section */}
      <View style={styles.addFriendsContainer}>
        <TouchableOpacity style={styles.addButton} onPress={handleAddViaContacts}>
          <Ionicons name="people-circle" size={24} color="#ffffff" />
          <Text style={styles.addButtonText}>Add via Contacts</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addButton} onPress={handleAddViaQRCode}>
          <Ionicons name="qr-code" size={24} color="#ffffff" />
          <Text style={styles.addButtonText}>Add via QR Code</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addButton} onPress={handleShareLink}>
          <Ionicons name="share-social" size={24} color="#ffffff" />
          <Text style={styles.addButtonText}>Share Link</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default SupportersScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 80,
    backgroundColor: '#ffffff',
  },
  addFriendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: '#dcdcdc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  loadingIndicator: {
    marginRight: 8,
  },
  suggestionsList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  suggestedProfileItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomColor: '#dcdcdc',
    borderBottomWidth: 1,
  },
  profileInfo: {
    marginLeft: 12,
    flex: 1,
  },
  usernameText: {
    fontSize: 16,
    fontWeight: '600',
  },
  suggestionsLoading: {
    marginVertical: 8,
  },
  // ... existing styles
  friendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  friendInfo: {
    marginLeft: 12,
    flex: 1,
  },
  removeButton: {
    marginLeft: 12,
  },
  // ... other styles
  searchBar: {
    height: 40,
    borderColor: '#dcdcdc',
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 16,
    marginTop: 10, // Adjust as needed to position the search bar
    marginBottom: 16,
  },
  sendButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  sendButtonText: {
    color: '#ffffff',
    fontSize: 14,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 8,
  },
  pendingFriendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    justifyContent: 'space-between',
  },
  profilePicture: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  username: {
    fontSize: 16,
    fontWeight: '600',
  },
  fullName: {
    fontSize: 14,
    color: '#777777',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  acceptButton: {
    marginRight: 12,
  },
  declineButton: {},
  emptyText: {
    textAlign: 'center',
    color: '#777777',
    marginVertical: 8,
  },
  addFriendsContainer: {
    marginTop: 24,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4CAF50',
    padding: 12,
    borderRadius: 8,
    marginVertical: 6,
  },
  addButtonText: {
    color: '#ffffff',
    marginLeft: 12,
    fontSize: 16,
  },
  sentFriendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelButton: {
    marginLeft: 12,
  },
});