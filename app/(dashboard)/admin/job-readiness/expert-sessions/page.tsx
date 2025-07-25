'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { toast } from '@/hooks/use-toast';
import { useDirectUpload } from '@/hooks/useDirectUpload';
import { Upload, Edit, Trash2, Play, Users, Clock, TrendingUp, Plus, Eye, EyeOff } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ExpertSession {
  id: string;
  title: string;
  description: string;
  video_storage_path: string;
  video_url: string;
  video_duration: number;
  created_at: string;
  updated_at: string;
  is_active: boolean;
  completion_stats?: {
    total_students: number;
    completed_students: number;
    completion_rate: number;
    average_completion_percentage: number;
  };
  job_readiness_expert_session_products?: Array<{
    product_id: string;
    products: {
      id: string;
      name: string;
      type: string;
    };
  }>;
}

interface Product {
  id: string;
  name: string;
  type: string;
}

export default function ExpertSessionsPage() {
  const [sessions, setSessions] = useState<ExpertSession[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<ExpertSession | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    product_ids: [] as string[],
    video_file: null as File | null,
    video_duration: '',
    video_url: '',
    video_storage_path: ''
  });

  // Direct upload hook
  const { uploadFile, uploading: videoUploading } = useDirectUpload({
    uploadType: 'expertSessions',
    onProgress: (progress) => {
      setUploadProgress(progress.percentage);
    },
    onSuccess: (result) => {
      handleSaveExpertSession(result);
    },
    onError: (error) => {
      console.error('Upload error:', error);
      setUploading(false);
    },
  });

  useEffect(() => {
    fetchSessions();
    fetchProducts();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/admin/job-readiness/expert-sessions');
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const data = await response.json();
      setSessions(data.sessions || []);
    } catch (error) {
      console.error('Error fetching sessions:', error);
      toast({
        title: 'Error',
        description: 'Failed to load expert sessions',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/admin/job-readiness/products');
      if (!response.ok) throw new Error('Failed to fetch products');
      const data = await response.json();
      setProducts(data.products?.filter((p: Product) => p.type === 'JOB_READINESS') || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('video/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select a video file',
          variant: 'destructive'
        });
        return;
      }

      // Validate file size (500MB limit)
      if (file.size > 500 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Video file must be less than 500MB',
          variant: 'destructive'
        });
        return;
      }

      setFormData(prev => ({ ...prev, video_file: file }));

      // Try to get video duration
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        const duration = Math.round(video.duration);
        setFormData(prev => ({ ...prev, video_duration: duration.toString() }));
        window.URL.revokeObjectURL(video.src);
      };
      video.src = URL.createObjectURL(file);
    }
  };

  // Handle successful video upload and save to database
  const handleSaveExpertSession = async (uploadResult: { key: string; publicUrl: string }) => {
    try {
      const response = await fetch('/api/admin/job-readiness/expert-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          product_ids: formData.product_ids,
          video_url: uploadResult.publicUrl,
          video_storage_path: uploadResult.key,
          video_duration: formData.video_duration ? parseInt(formData.video_duration) : null,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save session');
      }

      toast({
        title: 'Success',
        description: 'Expert session uploaded successfully'
      });

      setIsCreateDialogOpen(false);
      setFormData({
        title: '',
        description: '',
        product_ids: [],
        video_file: null,
        video_duration: '',
        video_url: '',
        video_storage_path: ''
      });
      setUploadProgress(0);
      fetchSessions();
    } catch (error) {
      console.error('Error saving session:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save session',
        variant: 'destructive'
      });
    } finally {
      setUploading(false);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.video_file || !formData.title || formData.product_ids.length === 0) {
      toast({
        title: 'Missing required fields',
        description: 'Please fill in all required fields, select at least one product, and upload a video file',
        variant: 'destructive'
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      // Upload file directly to R2
      await uploadFile(formData.video_file, {
        title: formData.title,
        duration: formData.video_duration || '',
      });
    } catch (error) {
      console.error('Error uploading session:', error);
      // Error handling is done in the hook's onError callback
    }
  };

  const handleEditSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;

    if (formData.product_ids.length === 0) {
      toast({
        title: 'Missing required fields',
        description: 'Please select at least one product',
        variant: 'destructive'
      });
      return;
    }

    try {
      const response = await fetch('/api/admin/job-readiness/expert-sessions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: editingSession.id,
          title: formData.title,
          description: formData.description,
          product_ids: formData.product_ids,
          is_active: editingSession.is_active
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update session');
      }

      toast({
        title: 'Success',
        description: 'Expert session updated successfully'
      });

      setIsEditDialogOpen(false);
      setEditingSession(null);
      fetchSessions();
    } catch (error) {
      console.error('Error updating session:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update session',
        variant: 'destructive'
      });
    }
  };

  const handleToggleActive = async (session: ExpertSession) => {
    try {
      const response = await fetch('/api/admin/job-readiness/expert-sessions', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          id: session.id,
          is_active: !session.is_active
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update session');
      }

      toast({
        title: 'Success',
        description: `Session ${!session.is_active ? 'activated' : 'deactivated'} successfully`
      });

      fetchSessions();
    } catch (error) {
      console.error('Error toggling session:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update session',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/admin/job-readiness/expert-sessions?id=${sessionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete session');
      }

      toast({
        title: 'Success',
        description: 'Expert session deleted successfully'
      });

      fetchSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete session',
        variant: 'destructive'
      });
    }
  };

  const openEditDialog = (session: ExpertSession) => {
    setEditingSession(session);
    
    // Extract product IDs from the session
    const currentProductIds = session.job_readiness_expert_session_products?.map(
      item => item.product_id
    ) || [];
    
    setFormData({
      title: session.title,
      description: session.description,
      product_ids: currentProductIds,
      video_file: null,
      video_duration: session.video_duration.toString(),
      video_url: session.video_url,
      video_storage_path: session.video_storage_path
    });
    setIsEditDialogOpen(true);
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Loading expert sessions...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Expert Sessions</h1>
          <p className="text-muted-foreground">
            Manage pre-recorded expert session videos for Job Readiness products
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
          <Plus className="h-4 w-4 mr-2" />
              Upload Session
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Upload Expert Session</DialogTitle>
              <DialogDescription>
                Upload a new expert session video (45min-1hr recommended, max 500MB)
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateSession} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter session title"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter session description"
                  rows={3}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product_ids">Job Readiness Products *</Label>
                <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`product-${product.id}`}
                        checked={formData.product_ids.includes(product.id)}
                        onCheckedChange={(checked) => {
                          setFormData(prev => {
                            if (checked) {
                              return {
                                ...prev,
                                product_ids: [...prev.product_ids, product.id]
                              };
                            } else {
                              return {
                                ...prev,
                                product_ids: prev.product_ids.filter(id => id !== product.id)
                              };
                            }
                          });
                        }}
                      />
                      <Label 
                        htmlFor={`product-${product.id}`} 
                        className="text-sm font-normal cursor-pointer"
                      >
                        {product.name}
                      </Label>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">
                  Select one or more products to assign this expert session to.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="video_file">Video File *</Label>
                <Input
                  id="video_file"
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  required
                />
                <p className="text-sm text-muted-foreground">
                  Supported formats: MP4, WebM, MOV. Maximum size: 500MB
                </p>
              </div>
              {formData.video_duration && (
                <div className="space-y-2">
                  <Label htmlFor="video_duration">Video Duration (seconds)</Label>
                  <Input
                    id="video_duration"
                    type="number"
                    value={formData.video_duration}
                    onChange={(e) => setFormData(prev => ({ ...prev, video_duration: e.target.value }))}
                                      placeholder="Auto-detected from video file"
                />
              </div>
              )}
              {(videoUploading || uploading) && uploadProgress > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Upload Progress</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={uploading || videoUploading}>
                  {uploading || videoUploading ? (
                    <>
                      <Upload className="h-4 w-4 mr-2 animate-spin" />
                      {videoUploading ? `Uploading... ${uploadProgress}%` : 'Saving...'}
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Session
                    </>
                  )}
        </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Play className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.filter(s => s.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.reduce((sum, s) => sum + (s.completion_stats?.total_students || 0), 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Completion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.length > 0
                ? Math.round(
                    sessions.reduce((sum, s) => sum + (s.completion_stats?.completion_rate || 0), 0) /
                    sessions.length
                  )
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Search sessions..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Expert Sessions</CardTitle>
          <CardDescription>
            Manage uploaded expert session videos and view completion statistics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Duration</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSessions.map((session) => (
                <TableRow key={session.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{session.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {session.description}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-muted-foreground" />
                      {formatDuration(session.video_duration)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={session.is_active ? 'default' : 'secondary'}>
                      {session.is_active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(session.created_at), { addSuffix: true })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openEditDialog(session)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleActive(session)}
                      >
                        {session.is_active ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Expert Session</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{session.title}"? This action cannot be undone.
                              Student progress data will be preserved.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteSession(session.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredSessions.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? 'No sessions found matching your search.' : 'No expert sessions uploaded yet.'}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Expert Session</DialogTitle>
            <DialogDescription>
              Update session details. Video file cannot be changed after upload.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSession} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_title">Title *</Label>
              <Input
                id="edit_title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Enter session title"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_description">Description *</Label>
              <Textarea
                id="edit_description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter session description"
                rows={3}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit_product_ids">Job Readiness Products *</Label>
              <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto border rounded-md p-3">
                {products.map((product) => (
                  <div key={product.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`edit-product-${product.id}`}
                      checked={formData.product_ids.includes(product.id)}
                      onCheckedChange={(checked) => {
                        setFormData(prev => {
                          if (checked) {
                            return {
                              ...prev,
                              product_ids: [...prev.product_ids, product.id]
                            };
                          } else {
                            return {
                              ...prev,
                              product_ids: prev.product_ids.filter(id => id !== product.id)
                            };
                          }
                        });
                      }}
                    />
                    <Label 
                      htmlFor={`edit-product-${product.id}`} 
                      className="text-sm font-normal cursor-pointer"
                    >
                      {product.name}
                    </Label>
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Select one or more products to assign this expert session to.
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">
                <Edit className="h-4 w-4 mr-2" />
                Update Session
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 