import { supabase } from '@/integrations/supabase/client';

export interface NotificationData {
    type: 'mark_added' | 'mark_updated' | 'mark_deleted' | 'comment_added' | 'comment_updated' | 'comment_deleted';
    projectId: string;
    imageId: string;
    authorId: string;
    authorName: string;
    authorEmail: string;
    content?: string;
    markType?: string;
    markColor?: string;
    coordinates?: { x: number; y: number };
}

// Send notification via Edge Function
export const sendNotification = async (notificationData: NotificationData): Promise<boolean> => {
    try {
        // Get the Edge Function URL from Supabase
        const { data: { url } } = supabase.functions.invoke('send-notifications', {
            body: { notificationData }
        });

        if (url) {
            console.log('Notification sent successfully via Edge Function');
            return true;
        } else {
            console.error('Failed to send notification: No response from Edge Function');
            return false;
        }
    } catch (error) {
        console.error('Error sending notification:', error);

        // Fallback: Try direct HTTP call to Edge Function
        try {
            const edgeFunctionUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-notifications`;

            const response = await fetch(edgeFunctionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({ notificationData }),
            });

            if (response.ok) {
                console.log('Notification sent successfully via direct HTTP call');
                return true;
            } else {
                console.error('Failed to send notification via HTTP:', response.statusText);
                return false;
            }
        } catch (httpError) {
            console.error('Error sending notification via HTTP fallback:', httpError);
            return false;
        }
    }
};

// Send notification for image mark changes
export const notifyMarkChange = async (
    type: 'mark_added' | 'mark_updated' | 'mark_deleted',
    projectId: string,
    imageId: string,
    authorId: string,
    authorName: string,
    authorEmail: string,
    markType: string,
    markColor: string,
    coordinates: { x: number; y: number },
    comment?: string
): Promise<boolean> => {
    const notificationData: NotificationData = {
        type,
        projectId,
        imageId,
        authorId,
        authorName,
        authorEmail,
        markType,
        markColor,
        coordinates,
        content: comment
    };

    return sendNotification(notificationData);
};

// Send notification for comment changes
export const notifyCommentChange = async (
    type: 'comment_added' | 'comment_updated' | 'comment_deleted',
    projectId: string,
    imageId: string,
    authorId: string,
    authorName: string,
    authorEmail: string,
    content: string
): Promise<boolean> => {
    const notificationData: NotificationData = {
        type,
        projectId,
        imageId,
        authorId,
        authorName,
        authorEmail,
        content
    };

    return sendNotification(notificationData);
};

// Get notification logs for a user
export const getNotificationLogs = async (userId?: string): Promise<any[]> => {
    try {
        const { data, error } = await supabase
            .from('notification_logs')
            .select('*')
            .eq('author_id', userId || '')
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Error fetching notification logs:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error in getNotificationLogs:', error);
        return [];
    }
};

// Get notification statistics for a project
export const getProjectNotificationStats = async (projectId: string): Promise<{
    totalNotifications: number;
    successfulNotifications: number;
    failedNotifications: number;
    lastNotificationDate: string | null;
}> => {
    try {
        const { data, error } = await supabase
            .from('notification_logs')
            .select('successful_count, failed_count, created_at')
            .eq('project_id', projectId);

        if (error) {
            console.error('Error fetching notification stats:', error);
            return {
                totalNotifications: 0,
                successfulNotifications: 0,
                failedNotifications: 0,
                lastNotificationDate: null
            };
        }

        const stats = {
            totalNotifications: data?.length || 0,
            successfulNotifications: data?.reduce((sum, log) => sum + (log.successful_count || 0), 0) || 0,
            failedNotifications: data?.reduce((sum, log) => sum + (log.failed_count || 0), 0) || 0,
            lastNotificationDate: data?.[0]?.created_at || null
        };

        return stats;
    } catch (error) {
        console.error('Error in getProjectNotificationStats:', error);
        return {
            totalNotifications: 0,
            successfulNotifications: 0,
            failedNotifications: 0,
            lastNotificationDate: null
        };
    }
};
