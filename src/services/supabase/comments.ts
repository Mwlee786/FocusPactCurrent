import { supabase } from './supabaseClient';

export const addComment = async (postId: string, content: string, userId: string) => {
  try {
    // First insert the comment
    const { data: newComment, error: insertError } = await supabase
      .from('comments')
      .insert([
        {
          post_id: postId,
          user_id: userId,
          content: content,
          created_at: new Date().toISOString(),
        }
      ])
      .select(`
        id,
        post_id,
        user_id,
        content,
        created_at,
        profiles!user_id (
          username,
          avatar_url
        )
      `)
      .single();

    if (insertError) throw insertError;
    return {
      ...newComment,
      profiles: newComment.profiles || { username: 'Anonymous' },
      likes: [],
      like_count: 0,
      is_liked_by_me: false
    };
  } catch (error) {
    console.error('Error adding comment:', error);
    throw error;
  }
};

export const getComments = async (postId: string) => {
  try {
    const { data, error } = await supabase
      .from('comments')
      .select(`
        id,
        post_id,
        user_id,
        content,
        created_at,
        profiles!user_id (
          username,
          avatar_url
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data?.map(comment => ({
      ...comment,
      profiles: comment.profiles || { username: 'Anonymous' },
      likes: [],
      like_count: 0,
      is_liked_by_me: false
    }));
  } catch (error) {
    console.error('Error fetching comments:', error);
    throw error;
  }
};

export const deleteComment = async (commentId: string, userId: string) => {
  try {
    // First verify the comment belongs to the user
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('user_id')
      .eq('id', commentId)
      .single();

    if (fetchError) throw fetchError;
    
    // Only allow deletion if the comment belongs to the user
    if (comment.user_id !== userId) {
      throw new Error('You can only delete your own comments');
    }

    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId)
      .eq('user_id', userId); // Extra safety check

    if (deleteError) throw deleteError;
    return true;
  } catch (error) {
    console.error('Error deleting comment:', error);
    throw error;
  }
}; 