// src/screens/auth/HomeScreen.tsx

import React, { useEffect, useState, useContext, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  ActivityIndicator,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  Button,
} from 'react-native';
import { supabase } from '../../services/supabase/supabaseClient';
import { AuthContext } from '../../context/AuthContext';
import {
  RealtimeChannel,
  REALTIME_LISTEN_TYPES,
  RealtimePostgresChangesPayload,
} from '@supabase/supabase-js';
import { MaterialIcons } from '@expo/vector-icons';

interface Profile {
  username: string;
  avatar_url?: string;
}

interface Like {
  id: string;
  user_id: string;
  created_at: string;
  profiles: Profile;
}

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile: {
    username: string;
    avatar_url?: string;
  };
  likes: Like[];
  like_count: number;
  is_liked_by_me: boolean;
}

interface Post {
  id: string;
  user_id: string;
  why_text: string;
  accomplishment_text: string;
  media_url: string | null;
  created_at: string;
  profiles: Profile | null;
  comments: Comment[];
  likes: Like[];
  comment_count: number;
  like_count: number;
  is_liked_by_me: boolean;
}

// Transform Supabase response to Post type
const transformSupabasePost = (rawPost: any): Post => {
  return {
    id: rawPost.id,
    user_id: rawPost.user_id,
    why_text: rawPost.why_text,
    accomplishment_text: rawPost.accomplishment_text,
    media_url: rawPost.media_url,
    created_at: rawPost.created_at,
    profiles: rawPost.profiles ? { username: rawPost.profiles.username } : null,
    comments: (rawPost.comments || []).map((comment: any) => ({
      id: comment.id,
      user_id: comment.user_id,
      content: comment.content,
      created_at: comment.created_at,
      profiles: { username: comment.profiles?.username || 'Anonymous' },
      likes: comment.likes || [],
      like_count: comment.like_count || 0,
      is_liked_by_me: comment.is_liked_by_me || false
    })),
    likes: rawPost.likes || [],
    comment_count: rawPost.comment_count || 0,
    like_count: rawPost.like_count || 0,
    is_liked_by_me: rawPost.is_liked_by_me || false
  };
};

// In-memory cache for profiles to optimize performance
const profileCache: { [key: string]: Profile } = {};

// Function to fetch profiles with caching
const fetchProfile = async (userId: string): Promise<Profile | null> => {
  console.log(`Fetching profile for userId: ${userId}`);
  if (profileCache[userId]) {
    console.log(`Profile for userId ${userId} found in cache`);
    return profileCache[userId];
  }

  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', userId)
    .single();

  if (profileError) {
    console.error('Error fetching profile:', profileError.message);
    return null;
  }

  console.log(`Profile fetched for userId ${userId}:`, profileData);
  profileCache[userId] = profileData;
  return profileData;
};

const HomeScreen: React.FC = () => {
  const { user } = useContext(AuthContext);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // State for editing posts
  const [isModalVisible, setIsModalVisible] = useState<boolean>(false);
  const [editablePost, setEditablePost] = useState<Post | null>(null);
  const [editedWhyText, setEditedWhyText] = useState<string>('');
  const [editedAccomplishmentText, setEditedAccomplishmentText] = useState<string>('');
  const [editedMediaUrl, setEditedMediaUrl] = useState<string | null>(null);

  // State and functions for the options menu
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isOptionsModalVisible, setIsOptionsModalVisible] = useState<boolean>(false);

  const [commentText, setCommentText] = useState('');
  const [commentingOnPost, setCommentingOnPost] = useState<string | null>(null);

  const openOptionsMenu = (post: Post) => {
    console.log(`Opening options menu for post: ${post.id}`);
    setSelectedPost(post);
    setIsOptionsModalVisible(true);
  };

  const closeOptionsMenu = () => {
    console.log('Closing options menu');
    setSelectedPost(null);
    setIsOptionsModalVisible(false);
  };

  const handleOptionsSelect = (option: 'Edit' | 'Delete') => {
    console.log(`Option selected: ${option}`);
    if (option === 'Edit' && selectedPost) {
      openEditModal(selectedPost);
    } else if (option === 'Delete' && selectedPost) {
      handleDeletePost(selectedPost.id);
    }
    closeOptionsMenu();
  };

  useEffect(() => {
    if (user?.id) {
      console.log('User ID found, fetching posts');
      fetchPosts();

      // Create a real-time subscription channel for posts
      const subscription: RealtimeChannel = supabase
        .channel('public:posts')
        .on(
          REALTIME_LISTEN_TYPES.POSTGRES_CHANGES,
          { event: '*', schema: 'public', table: 'posts' },
          async (payload: RealtimePostgresChangesPayload<Post>) => {
            console.log(`Real-time event: ${payload.eventType} for post ID: ${(payload.new as Post)?.id || (payload.old as Post)?.id}`);
            try {
              if (payload.eventType === 'INSERT') {
                console.log('Handling INSERT event');
                const newPostData = payload.new;
                if (!newPostData) {
                  console.log('No new post data');
                  return;
                }

                let username = 'Anonymous';

                if (newPostData.user_id === user.id && user.username) {
                  username = user.username;
                } else {
                  const profile = await fetchProfile(newPostData.user_id);
                  if (profile) {
                    username = profile.username;
                  }
                }

                const newPost: Post = {
                  ...newPostData,
                  profiles: { username },
                };

                setPosts(prevPosts => [newPost, ...prevPosts]);
                console.log('New post added to state:', newPost.id);
              } else if (payload.eventType === 'UPDATE') {
                console.log('Handling UPDATE event');
                const updatedPostData = payload.new;
                if (!updatedPostData) {
                  console.log('No updated post data');
                  return;
                }

                let username = 'Anonymous';

                if (updatedPostData.user_id === user.id && user.username) {
                  username = user.username;
                } else {
                  const profile = await fetchProfile(updatedPostData.user_id);
                  if (profile) {
                    username = profile.username;
                  }
                }

                const updatedPost: Post = {
                  ...updatedPostData,
                  profiles: { username },
                };

                setPosts(prevPosts =>
                  prevPosts.map(post =>
                    post.id === updatedPost.id ? updatedPost : post
                  )
                );
                console.log('Post updated in state:', updatedPost.id);
              } else if (payload.eventType === 'DELETE') {
                console.log('Handling DELETE event');
                const deletedPostData = payload.old;
                if (!deletedPostData) {
                  console.log('No deleted post data');
                  return;
                }

                setPosts(prevPosts =>
                  prevPosts.filter(post => post.id !== deletedPostData.id)
                );
                console.log('Post removed from state:', deletedPostData.id);
              }
            } catch (error) {
              console.error('Error handling real-time event:', error);
            }
          }
        )
        .subscribe();

      return () => {
        console.log('Unsubscribing from real-time posts channel');
        supabase.removeChannel(subscription);
      };
    }
  }, [user]);

  useEffect(() => {
    if (isModalVisible) {
      console.log('Edit Modal is now visible');
    }
  }, [isModalVisible]);

  const fetchPosts = async () => {
    console.log('Fetching posts for user');
    if (!user?.id) {
      console.log('No user ID, skipping fetchPosts');
      setLoading(false);
      return;
    }

    try {
      const { data: friendships, error: friendshipError } = await supabase
        .from('friendships')
        .select('*')
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .neq('status', 'declined');

      if (friendshipError) throw friendshipError;

      const friendIds = friendships
        ? friendships.map(f =>
            f.requester_id === user.id ? f.receiver_id : f.requester_id
          )
        : [];

      const allRelevantIds = [user.id, ...friendIds];
      console.log('Fetching posts for users:', allRelevantIds);

      // Update the query to properly type the profiles
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          why_text,
          accomplishment_text,
          media_url,
          created_at,
          profiles!inner (
            username
          ),
          post_likes!left (
            id,
            user_id
          ),
          comments!left (
            id,
            user_id,
            content,
            created_at
          )
        `)
        .in('user_id', allRelevantIds)
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      if (postsData) {
        // Transform posts with initial data for likes and comments
        const transformedPosts = postsData.map(post => ({
          ...post,
          profiles: post.profiles ? { username: (post.profiles as any).username } : null,
          comments: (post.comments || []).map(comment => ({
            id: comment.id,
            user_id: comment.user_id,
            content: comment.content,
            created_at: comment.created_at,
            profile: {
              username: user.username || 'Anonymous',
              avatar_url: user.user_metadata?.avatar_url
            },
            likes: [],
            like_count: 0,
            is_liked_by_me: false
          })),
          likes: (post.post_likes || []).map(like => ({
            ...like,
            created_at: new Date().toISOString(),
            profiles: { username: 'Anonymous' }
          })),
          comment_count: (post.comments || []).length,
          like_count: (post.post_likes || []).length,
          is_liked_by_me: (post.post_likes || []).some(like => like.user_id === user.id)
        }));
        setPosts(transformedPosts);
        console.log('Posts set in state with initial data:', transformedPosts.length);
      }
    } catch (error: any) {
      console.error('Error fetching posts:', error.message);
      Alert.alert('Error', 'Failed to fetch posts.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleShareToFeed = async () => {
    console.log('Handling share to feed');
    if (!user?.id) {
      console.log('User not authenticated');
      Alert.alert('Error', 'User is not authenticated.');
      return;
    }

    try {
      setUploading(true);
      console.log('Uploading new post');

      const newPost = {
        user_id: user.id,
        why_text: 'Sample Why Text',
        accomplishment_text: 'Sample Accomplishment Text',
        media_url: null,
      };

      const { data, error } = await supabase.from('posts').insert([newPost]).select();

      if (error) {
        console.error('Error inserting new post:', error.message);
        throw error;
      }

      if (data && data.length > 0) {
        const insertedPost: Post = {
          ...newPost,
          id: data[0].id,
          created_at: data[0].created_at,
          profiles: { username: user.username || 'Anonymous' },
          comments: [],
          likes: [],
          comment_count: 0,
          like_count: 0,
          is_liked_by_me: false
        };
        setPosts(prevPosts => [insertedPost, ...prevPosts]);
        console.log('New post added to state:', insertedPost.id);
      }
    } catch (error: any) {
      console.error('Error uploading post:', error.message);
      Alert.alert('Error', 'Failed to share your post. Please try again.');
    } finally {
      setUploading(false);
      console.log('Upload finished');
    }
  };

  const openEditModal = (post: Post) => {
    console.log(`Opening edit modal for post: ${post.id}`);
    setEditablePost(post);
    setEditedWhyText(post.why_text);
    setEditedAccomplishmentText(post.accomplishment_text);
    setEditedMediaUrl(post.media_url);
    setIsModalVisible(true);
    console.log('isModalVisible set to true');
  };

  const closeEditModal = () => {
    console.log('Closing edit modal');
    setEditablePost(null);
    setIsModalVisible(false);
    setEditedWhyText('');
    setEditedAccomplishmentText('');
    setEditedMediaUrl(null);
    console.log('isModalVisible set to false and fields reset');
  };

  const handleEditPost = async () => {
    console.log('handleEditPost called');
    if (!editablePost) {
      console.log('No editable post selected');
      return;
    }

    console.log(`Editing post with id: ${editablePost.id}`);
    console.log('New why_text:', editedWhyText);
    console.log('New accomplishment_text:', editedAccomplishmentText);
    console.log('New media_url:', editedMediaUrl);

    try {
      const { data, error } = await supabase
        .from('posts')
        .update({
          why_text: editedWhyText,
          accomplishment_text: editedAccomplishmentText,
          media_url: editedMediaUrl,
        })
        .eq('id', editablePost.id)
        .select();

      if (error) {
        console.error('Error updating post:', error.message);
        throw error;
      }

      if (data && data.length > 0) {
        const updatedPost: Post = {
          ...data[0],
          profiles: { username: editablePost.profiles?.username || 'Anonymous' },
        };

        setPosts(prevPosts =>
          prevPosts.map(post => (post.id === updatedPost.id ? updatedPost : post))
        );

        console.log('Post updated successfully:', updatedPost.id);
        Alert.alert('Success', 'Post updated successfully.');
        closeEditModal();
      } else {
        console.log('No data returned after update');
        Alert.alert('Error', 'No data returned after updating post.');
      }
    } catch (error: any) {
      console.error('Error updating post:', error.message);
      Alert.alert('Error', 'Failed to update post.');
    }
  };

  const handleDeletePost = async (postId: string) => {
    console.log(`Attempting to delete post: ${postId}`);
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            console.log(`Deleting post: ${postId}`);
            try {
              const { error } = await supabase.from('posts').delete().eq('id', postId);

              if (error) {
                console.error('Error deleting post:', error.message);
                throw error;
              }

              setPosts(prevPosts => prevPosts.filter(post => post.id !== postId));
              console.log('Post deleted successfully:', postId);
              Alert.alert('Success', 'Post deleted successfully.');
            } catch (error: any) {
              console.error('Error deleting post:', error.message);
              Alert.alert('Error', 'Failed to delete post.');
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const handleLikePost = async (postId: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to like posts.');
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    console.log('Attempting to like/unlike post:', {
      postId,
      userId: user.id,
      currentLikeStatus: post.is_liked_by_me,
      postOwnerId: post.user_id
    });

    try {
      if (post.is_liked_by_me) {
        // Unlike the post
        console.log('Unliking post...');
        const { error: unlikeError } = await supabase
          .from('post_likes')
          .delete()
          .eq('post_id', postId)
          .eq('user_id', user.id);

        if (unlikeError) throw unlikeError;
        console.log('Successfully unliked post');

        // Update local state
        setPosts(prevPosts =>
          prevPosts.map(p =>
            p.id === postId
              ? {
                  ...p,
                  like_count: p.like_count - 1,
                  is_liked_by_me: false
                }
              : p
          )
        );
      } else {
        // Like the post
        console.log('Liking post...');
        const { error: likeError } = await supabase
          .from('post_likes')
          .insert([
            {
              post_id: postId,
              user_id: user.id,
              created_at: new Date().toISOString()
            }
          ])
          .single();

        if (likeError) {
          // If it's a duplicate like, just ignore it
          if (likeError.code === '23505') { // Postgres unique constraint violation code
            console.log('Duplicate like detected');
            return;
          }
          throw likeError;
        }
        console.log('Successfully liked post');

        // Update local state
        setPosts(prevPosts =>
          prevPosts.map(p =>
            p.id === postId
              ? {
                  ...p,
                  like_count: p.like_count + 1,
                  is_liked_by_me: true
                }
              : p
          )
        );
      }
    } catch (error: any) {
      console.error('Error toggling post like:', error);
      Alert.alert('Error', 'Failed to update like status');
      
      // Revert optimistic update if there was an error
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p.id === postId
            ? {
                ...p,
                like_count: post.like_count,
                is_liked_by_me: post.is_liked_by_me
              }
            : p
        )
      );
    }
  };

  const handleAddComment = async (postId: string) => {
    if (!user?.id) {
      Alert.alert('Error', 'You must be logged in to comment.');
      return;
    }

    if (!commentText.trim()) {
      Alert.alert('Error', 'Comment cannot be empty.');
      return;
    }

    // Create optimistic comment
    const optimisticComment: Comment = {
      id: Date.now().toString(),
      user_id: user.id,
      content: commentText.trim(),
      created_at: new Date().toISOString(),
      profile: {
        username: user.username || 'Anonymous'
      },
      likes: [],
      like_count: 0,
      is_liked_by_me: false
    };

    // Optimistically update local state
    setPosts(prevPosts =>
      prevPosts.map(p =>
        p.id === postId
          ? {
              ...p,
              comments: [...p.comments, optimisticComment],
              comment_count: p.comment_count + 1,
            }
          : p
      )
    );

    const commentTextToSend = commentText.trim();
    setCommentText('');
    setCommentingOnPost(null);

    try {
      // Add comment directly using Supabase
      const { data: newComment, error } = await supabase
        .from('comments')
        .insert([
          {
            post_id: postId,
            user_id: user.id,
            content: commentTextToSend,
            created_at: new Date().toISOString(),
          }
        ])
        .select()
        .single();

      if (error) throw error;

      if (newComment) {
        // Transform the comment to match our interface
        const transformedComment: Comment = {
          id: newComment.id,
          user_id: newComment.user_id,
          content: newComment.content,
          created_at: newComment.created_at,
          profile: {
            username: user.username || 'Anonymous',
            avatar_url: user.user_metadata?.avatar_url
          },
          likes: [],
          like_count: 0,
          is_liked_by_me: false
        };

        // Update local state with the actual comment
        setPosts(prevPosts =>
          prevPosts.map(p =>
            p.id === postId
              ? {
                  ...p,
                  comments: p.comments.map(c =>
                    c.id === optimisticComment.id ? transformedComment : c
                  ),
                }
              : p
          )
        );
      }
    } catch (error: any) {
      console.error('Error adding comment:', error);
      Alert.alert('Error', 'Failed to add comment');
      
      // Revert optimistic update
      setPosts(prevPosts =>
        prevPosts.map(p =>
          p.id === postId
            ? {
                ...p,
                comments: p.comments.filter(c => c.id !== optimisticComment.id),
                comment_count: p.comment_count - 1,
              }
            : p
        )
      );
    }
  };

  const renderPost = ({ item }: { item: Post }) => {
    console.log('Rendering post:', {
      id: item.id,
      username: item.profiles?.username,
      likeCount: item.like_count,
      commentCount: item.comment_count,
      isLikedByMe: item.is_liked_by_me,
      commentsLength: item.comments.length
    });
    
    return (
      <View style={styles.postContainer}>
        <View style={styles.postHeader}>
          <View>
            <Text style={styles.username}>{item.profiles?.username || 'Anonymous'}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.created_at).toLocaleDateString()}
            </Text>
          </View>
          {item.user_id === user?.id && (
            <TouchableOpacity onPress={() => openOptionsMenu(item)}>
              <MaterialIcons name="more-vert" size={24} color="#555" />
            </TouchableOpacity>
          )}
        </View>
        <Text style={styles.whyText}>{item.why_text}</Text>
        <Text style={styles.accomplishment}>{item.accomplishment_text}</Text>
        {item.media_url && (
          <Image
            source={{ uri: item.media_url }}
            style={styles.postMedia}
            resizeMode="cover"
            onError={error => {
              console.error('Image loading error:', error.nativeEvent.error);
            }}
          />
        )}

        {/* Social Actions Bar */}
        <View style={[styles.socialActionsBar, { borderTopWidth: 1, borderTopColor: '#eee', marginTop: 12 }]}>
          <View style={styles.leftActions}>
            <TouchableOpacity 
              style={[styles.actionButton, { marginRight: 20 }]}
              onPress={() => handleLikePost(item.id)}
            >
              <MaterialIcons
                name={item.is_liked_by_me ? 'favorite' : 'favorite-border'}
                size={24}
                color={item.is_liked_by_me ? '#FF4081' : '#666'}
              />
              <Text style={[styles.actionCount, { marginLeft: 6 }]}>{item.like_count}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => setCommentingOnPost(item.id)}
            >
              <MaterialIcons
                name="chat-bubble-outline"
                size={24}
                color="#666"
              />
              <Text style={[styles.actionCount, { marginLeft: 6 }]}>{item.comment_count}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Comments Section */}
        {item.comments.length > 0 && (
          <View style={[styles.commentsSection, { marginTop: 12, paddingTop: 8 }]}>
            <FlatList
              data={item.comments}
              keyExtractor={comment => comment.id}
              renderItem={({ item: comment }) => (
                <View style={styles.commentItem}>
                  <Text style={[styles.commentUsername, { marginRight: 8 }]}>
                    {comment.profile?.username || 'Anonymous'}:
                  </Text>
                  <Text style={styles.commentText}>{comment.content}</Text>
                </View>
              )}
              scrollEnabled={false}
            />
          </View>
        )}

        {/* Comment Input */}
        {commentingOnPost === item.id && (
          <View style={[styles.commentInputContainer, { marginTop: 12 }]}>
            <TextInput
              style={[styles.commentInput, { flex: 1 }]}
              value={commentText}
              onChangeText={setCommentText}
              placeholder="Add a comment..."
              multiline
            />
            <TouchableOpacity
              style={[styles.commentSubmitButton, { marginLeft: 8 }]}
              onPress={() => handleAddComment(item.id)}
            >
              <MaterialIcons name="send" size={20} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchPosts();
    } catch (error) {
      console.error('Error refreshing feed:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  if (loading) {
    return (
      <View style={styles.loaderContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {uploading && <ActivityIndicator size="large" color="#4CAF50" />}
      {posts.length === 0 ? (
        <View style={styles.noPostsContainer}>
          <Text style={styles.noPostsText}>No posts to display.</Text>
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={item => item.id}
          renderItem={renderPost}
          contentContainerStyle={styles.postsList}
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      )}

      {/* Options Menu Modal */}
      <Modal
        visible={isOptionsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeOptionsMenu}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPressOut={closeOptionsMenu}
        >
          <View style={styles.optionsModal}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => handleOptionsSelect('Edit')}
            >
              <Text style={styles.optionText}>Edit Post</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => handleOptionsSelect('Delete')}
            >
              <Text style={[styles.optionText, { color: 'red' }]}>Delete Post</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.optionButton} onPress={closeOptionsMenu}>
              <Text style={styles.optionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Edit Post Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeEditModal}
      >
        <View style={styles.absoluteModalContainer}>
          <View style={styles.editModalContent}>
            <Text style={styles.editModalTitle}>Edit Post</Text>
            <TextInput
              style={styles.textInput}
              value={editedWhyText}
              onChangeText={setEditedWhyText}
              placeholder="Why is this important?"
              multiline
            />
            <TextInput
              style={styles.textInput}
              value={editedAccomplishmentText}
              onChangeText={setEditedAccomplishmentText}
              placeholder="What did you accomplish?"
              multiline
            />
            <View style={styles.editModalButtons}>
              <Button title="Cancel" onPress={closeEditModal} />
              <Button title="Save" onPress={handleEditPost} />
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default HomeScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    paddingTop: 70, // Ensure paddingTop has a value
    backgroundColor: '#ffffff',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noPostsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  noPostsText: {
    textAlign: 'center',
    fontSize: 16,
    color: '#555555',
  },
  postsList: {
    paddingBottom: 16,
  },
  postContainer: {
    padding: 16,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  postHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  username: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333333',
  },
  timestamp: {
    fontSize: 12,
    color: '#888888',
  },
  whyText: {
    fontSize: 14,
    fontStyle: 'italic',
    color: '#555555',
    marginBottom: 8,
  },
  accomplishment: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 8,
  },
  postMedia: {
    width: '100%',
    height: 200,
    borderRadius: 6,
  },
  // Modal styles for options menu
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'flex-end',
  },
  optionsModal: {
    backgroundColor: '#fff',
    padding: 20,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  optionButton: {
    paddingVertical: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#007AFF',
  },
  // Modal styles for editing posts
  absoluteModalContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  editModalContent: {
    width: '90%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    elevation: 5, // Add elevation for Android
    shadowColor: '#000', // Add shadow for iOS
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  editModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  inputLabel: {
    fontSize: 14,
    color: '#333',
    marginTop: 10,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    marginTop: 4,
    fontSize: 14,
    minHeight: 40,
  },
  editModalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  socialActionsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    paddingVertical: 4,
  },
  actionCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 6,
  },
  commentsSection: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  commentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingVertical: 4,
  },
  commentUsername: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 8,
  },
  commentText: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 20,
    padding: 8,
    marginTop: 12,
    backgroundColor: '#f8f8f8',
  },
  commentInput: {
    flex: 1,
    padding: 8,
    fontSize: 14,
    minHeight: 36,
  },
  commentSubmitButton: {
    padding: 8,
    backgroundColor: '#FF4081',
    borderRadius: 20,
    marginLeft: 8,
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});