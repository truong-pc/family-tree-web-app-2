"use client"

import { useState, useEffect } from "react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Trash2, Users, Edit, Plus, Eye, Share2 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import Link from "next/link"

interface Chart {
  _id: string
  name: string | null
  description: string | null
  published: boolean
  editors: string[]
  createdAt: string
}

export default function UserChartSection() {
  const [chart, setChart] = useState<Chart | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { toast } = useToast()

  // States for forms
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isEditorsOpen, setIsEditorsOpen] = useState(false)
  
  const [formData, setFormData] = useState({ name: "", description: "", published: false })
  const [editorEmail, setEditorEmail] = useState("")

  const fetchMyChart = async () => {
    setIsLoading(true)
    try {
      const data = await api.getMyChart()
      setChart(data)
    } catch (error) {
      console.error("Failed to fetch my chart", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchMyChart()
  }, [])

  const handleCreate = async () => {
    try {
      await api.createChart({ name: formData.name, description: formData.description })
      toast({ title: "Thành công", description: "Đã tạo gia phả mới." })
      setIsCreateOpen(false)
      fetchMyChart()
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể tạo gia phả.", variant: "destructive" })
    }
  }

  const handleUpdate = async () => {
    if (!chart) return
    try {
      await api.updateChart(chart._id, { 
        name: formData.name, 
        description: formData.description,
        published: formData.published 
      })
      toast({ title: "Thành công", description: "Đã cập nhật thông tin." })
      setIsEditOpen(false)
      fetchMyChart()
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể cập nhật.", variant: "destructive" })
    }
  }

  const handleDelete = async () => {
    if (!chart || !confirm("Bạn có chắc chắn muốn xóa gia phả này? Hành động này không thể hoàn tác.")) return
    try {
      await api.deleteChart(chart._id)
      toast({ title: "Thành công", description: "Đã xóa gia phả." })
      setChart(null)
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể xóa gia phả.", variant: "destructive" })
    }
  }

  const handleAddEditor = async () => {
    if (!chart || !editorEmail) return
    try {
      await api.addEditor(chart._id, editorEmail)
      toast({ title: "Thành công", description: `Đã thêm ${editorEmail} làm người chỉnh sửa.` })
      setEditorEmail("")
      fetchMyChart()
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể thêm người dùng này.", variant: "destructive" })
    }
  }

  const handleRemoveEditor = async (email: string) => {
    if (!chart) return
    try {
      await api.removeEditor(chart._id, email)
      toast({ title: "Thành công", description: "Đã xóa quyền chỉnh sửa." })
      fetchMyChart()
    } catch (error) {
      toast({ title: "Lỗi", description: "Không thể xóa người dùng này.", variant: "destructive" })
    }
  }

  if (isLoading) {
    return <div className="h-40 flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>
  }

  // --- VIEW: NO CHART (CREATE MODE) ---
  if (!chart) {
    return (
      <Card className="border-dashed border-2">
        <CardHeader className="text-center">
          <CardTitle>Bạn chưa có Gia Phả nào</CardTitle>
          <CardDescription>Bắt đầu tạo cây gia phả cho dòng họ của bạn ngay hôm nay.</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center pb-6">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button size="lg" onClick={() => setFormData({ name: "", description: "", published: false })}>
                <Plus className="mr-2 h-4 w-4" /> Tạo Gia Phả Mới
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo Gia Phả Mới</DialogTitle>
                <DialogDescription>Nhập thông tin cơ bản cho gia phả của bạn.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">Tên Gia Phả</Label>
                  <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="Ví dụ: Gia tộc Nguyễn Văn" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="desc">Mô tả</Label>
                  <Textarea id="desc" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Mô tả ngắn về dòng họ..." />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleCreate}>Tạo Mới</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    )
  }

  // --- VIEW: HAS CHART (MANAGE MODE) ---
  return (
    <Card className="border-primary/20 shadow-md">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl flex items-center gap-2">
              {chart.name || "Gia Phả Chưa Đặt Tên"}
              {chart.published ? (
                <Badge variant="default" className="bg-green-600 hover:bg-green-700"><Share2 className="w-3 h-3 mr-1"/> Công khai</Badge>
              ) : (
                <Badge variant="secondary">Riêng tư</Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-2">{chart.description || "Chưa có mô tả"}</CardDescription>
          </div>
          <Button variant="default" size="sm" asChild>
             {/* Placeholder link for future tree visualization */}
            <Link href={`/dashboard/tree/${chart._id}`}>
              <Eye className="mr-2 h-4 w-4" /> Xem Sơ Đồ Phả Hệ
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-sm text-muted-foreground mb-4">
          Ngày tạo: {new Date(chart.createdAt).toLocaleDateString('vi-VN')}
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Edit Dialog */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" onClick={() => setFormData({ 
                name: chart.name || "", 
                description: chart.description || "", 
                published: chart.published 
              })}>
                <Edit className="mr-2 h-4 w-4" /> Chỉnh sửa thông tin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cập nhật thông tin</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label>Tên Gia Phả</Label>
                  <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="grid gap-2">
                  <Label>Mô tả</Label>
                  <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch id="published" checked={formData.published} onCheckedChange={(c) => setFormData({ ...formData, published: c })} />
                  <Label htmlFor="published">Công khai (Mọi người đều có thể xem)</Label>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleUpdate}>Lưu thay đổi</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Editors Dialog */}
          <Dialog open={isEditorsOpen} onOpenChange={setIsEditorsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Users className="mr-2 h-4 w-4" /> Quản lý người chỉnh sửa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Danh sách người chỉnh sửa</DialogTitle>
                <DialogDescription>Thêm email của người dùng khác để họ cùng quản lý cây gia phả này.</DialogDescription>
              </DialogHeader>
              
              <div className="flex gap-2 mb-4">
                <Input placeholder="Email người dùng..." value={editorEmail} onChange={(e) => setEditorEmail(e.target.value)} />
                <Button onClick={handleAddEditor}>Thêm</Button>
              </div>

              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {chart.editors && chart.editors.length > 0 ? (
                  chart.editors.map((email, idx) => (
                    <div key={idx} className="flex justify-between items-center p-2 bg-secondary rounded-md">
                      <span className="text-sm">{email}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => handleRemoveEditor(email)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Chưa có người chỉnh sửa nào khác.</p>
                )}
              </div>
            </DialogContent>
          </Dialog>

          {/* Delete Button */}
          <Button variant="destructive" size="sm" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" /> Xóa Gia Phả
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
